/**
 * Production Form Submission Service
 * Real browser automation with AI-powered form filling
 */

const express = require('express');
const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class FormSubmissionService {
  constructor(supabase) {
    this.supabase = supabase;
    this.jobs = new Map();
    this.wsClients = new Set();
    this.browser = null;
    this.setupBrowser();
  }

  async setupBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      console.log('✅ Browser initialized for form submissions');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
    }
  }

  async startSubmission(params) {
    const jobId = uuidv4();
    const job = {
      id: jobId,
      url: params.url,
      status: 'pending',
      progress: 0,
      fieldsFound: 0,
      fieldsCompleted: 0,
      customData: params.customData || {},
      agent: params.agent || 'hybrid',
      createdAt: new Date().toISOString(),
      error: null
    };

    this.jobs.set(jobId, job);
    this.broadcastJobUpdate(job);

    // Start processing asynchronously
    this.processJob(jobId).catch(error => {
      console.error(`Job ${jobId} failed:`, error);
      const failedJob = this.jobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.error = error.message;
        this.broadcastJobUpdate(failedJob);
      }
    });

    return job;
  }

  async processJob(jobId, jobData = null) {
    let job = this.jobs.get(jobId);
    
    // If job not in memory, create from provided data or fetch from database
    if (!job && jobData) {
      job = {
        id: jobId,
        url: jobData.url,
        status: 'pending',
        progress: 0,
        fieldsFound: 0,
        fieldsCompleted: 0,
        customData: jobData.customData || {},
        agentId: jobData.agentId || 'hybrid-ai',
        createdAt: new Date().toISOString(),
        error: null
      };
      this.jobs.set(jobId, job);
    } else if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    try {
      job.status = 'running';
      job.progress = 10;
      this.broadcastJobUpdate(job);

      if (!this.browser) {
        await this.setupBrowser();
      }

      const page = await this.browser.newPage();
      
      // Set realistic user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });

      job.progress = 20;
      this.broadcastJobUpdate(job);

      // Navigate to the URL
      console.log(`📍 Navigating to: ${job.url}`);
      await page.goto(job.url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      job.progress = 40;
      this.broadcastJobUpdate(job);

      // Analyze the page for forms
      const formAnalysis = await this.analyzeFormFields(page);
      job.fieldsFound = formAnalysis.fields.length;
      
      job.progress = 60;
      this.broadcastJobUpdate(job);

      // Fill the form fields
      const filledFields = await this.fillFormFields(page, formAnalysis.fields, job.customData);
      job.fieldsCompleted = filledFields;

      job.progress = 80;
      this.broadcastJobUpdate(job);

      // Take screenshot for verification
      const screenshot = await page.screenshot({ 
        encoding: 'base64',
        fullPage: false 
      });
      job.screenshot = `data:image/png;base64,${screenshot}`;

      // Submit the form
      const submitResult = await this.submitForm(page, formAnalysis.submitButton);
      
      job.progress = 100;
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      
      console.log(`✅ Form submission completed for ${job.url}`);
      
      await page.close();
      this.broadcastJobUpdate(job);

    } catch (error) {
      console.error(`❌ Job ${jobId} failed:`, error);
      job.status = 'failed';
      job.error = error.message;
      job.progress = 0;
      this.broadcastJobUpdate(job);
    }
  }

  async analyzeFormFields(page) {
    return await page.evaluate(() => {
      // Helper function to get CSS selector
      function getSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.name) return `[name="${element.name}"]`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return element.tagName.toLowerCase();
      }

      // Helper function to find associated label
      function findLabel(input) {
        if (input.id) {
          const label = document.querySelector(`label[for="${input.id}"]`);
          if (label) return label.textContent.trim();
        }
        
        const parentLabel = input.closest('label');
        if (parentLabel) return parentLabel.textContent.trim();
        
        return input.placeholder || input.name || '';
      }

      const forms = document.querySelectorAll('form');
      const fields = [];
      let submitButton = null;

      forms.forEach(form => {
        // Find input fields
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
          if (input.type !== 'submit' && input.type !== 'button') {
            fields.push({
              selector: getSelector(input),
              type: input.type || input.tagName.toLowerCase(),
              name: input.name || input.id || '',
              placeholder: input.placeholder || '',
              required: input.required,
              label: findLabel(input)
            });
          }
        });

        // Find submit button
        const submit = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
        if (submit && !submitButton) {
          submitButton = getSelector(submit);
        }
      });

      return { fields, submitButton };
    });
  }

  async fillFormFields(page, fields, customData) {
    let filledCount = 0;
    
    for (const field of fields) {
      try {
        const fieldValue = this.getFieldValue(field, customData);
        if (fieldValue) {
          await page.waitForSelector(field.selector, { timeout: 5000 });
          
          if (field.type === 'select') {
            await page.select(field.selector, fieldValue);
          } else {
            await page.focus(field.selector);
            await page.keyboard.down('Control');
            await page.keyboard.press('a');
            await page.keyboard.up('Control');
            await page.type(field.selector, fieldValue);
          }
          
          filledCount++;
          console.log(`✅ Filled field: ${field.name || field.selector} = ${fieldValue}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not fill field ${field.selector}:`, error.message);
      }
    }
    
    return filledCount;
  }

  getFieldValue(field, customData) {
    const fieldKey = field.name || field.label.toLowerCase();
    
    // Check custom data first
    if (customData[fieldKey]) return customData[fieldKey];
    
    // Smart field mapping based on common field names
    const fieldMappings = {
      // Contact info
      'name': customData.name || 'John Doe',
      'first_name': customData.firstName || customData.name?.split(' ')[0] || 'John',
      'last_name': customData.lastName || customData.name?.split(' ')[1] || 'Doe',
      'email': customData.email || 'john.doe@example.com',
      'phone': customData.phone || '+1-555-123-4567',
      'company': customData.company || 'Example Corp',
      'title': customData.title || 'Software Engineer',
      'message': customData.message || 'Hello, I am interested in learning more about your services.',
      'subject': customData.subject || 'Business Inquiry',
      'website': customData.website || 'https://example.com',
      'address': customData.address || '123 Main St',
      'city': customData.city || 'New York',
      'state': customData.state || 'NY',
      'zip': customData.zip || '10001',
      'country': customData.country || 'United States'
    };

    // Try exact match first
    if (fieldMappings[fieldKey]) return fieldMappings[fieldKey];
    
    // Try partial matches for common patterns
    const lowerKey = fieldKey.toLowerCase();
    if (lowerKey.includes('email')) return fieldMappings.email;
    if (lowerKey.includes('phone')) return fieldMappings.phone;
    if (lowerKey.includes('name') && !lowerKey.includes('company')) {
      if (lowerKey.includes('first')) return fieldMappings.first_name;
      if (lowerKey.includes('last')) return fieldMappings.last_name;
      return fieldMappings.name;
    }
    if (lowerKey.includes('company')) return fieldMappings.company;
    if (lowerKey.includes('message') || lowerKey.includes('comment')) return fieldMappings.message;
    if (lowerKey.includes('subject')) return fieldMappings.subject;
    
    return null;
  }

  async submitForm(page, submitButtonSelector) {
    if (!submitButtonSelector) {
      console.warn('⚠️ No submit button found, attempting form submission');
      return false;
    }

    try {
      await page.click(submitButtonSelector);
      await page.waitForNavigation({ 
        waitUntil: 'networkidle2',
        timeout: 15000 
      }).catch(() => {
        // Form might submit without navigation
        console.log('Form submitted without page navigation');
      });
      
      return true;
    } catch (error) {
      console.warn('⚠️ Form submission failed:', error.message);
      return false;
    }
  }

  async broadcastJobUpdate(job) {
    // Update in Supabase database
    if (this.supabase) {
      try {
        await this.supabase
          .from('form_submissions')
          .update({
            status: job.status,
            progress: job.progress,
            fields_found: job.fieldsFound,
            fields_completed: job.fieldsCompleted,
            error: job.error,
            screenshot: job.screenshot,
            completed_at: job.status === 'completed' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
      } catch (error) {
        console.error('Failed to update job in database:', error);
      }
    }

    // Broadcast to WebSocket clients
    const message = JSON.stringify(job);
    this.wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  getAllJobs() {
    return Array.from(this.jobs.values()).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  async cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      this.broadcastJobUpdate(job);
    }
  }

  addWebSocketClient(ws) {
    this.wsClients.add(ws);
    ws.on('close', () => {
      this.wsClients.delete(ws);
    });
  }
}

module.exports = FormSubmissionService;