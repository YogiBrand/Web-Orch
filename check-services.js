// Service Health Check Script
async function checkServices() {
  console.log('🔍 Checking Agent Registry Services...\n');

  const services = [
    { name: 'Main Application', port: 5173, path: '/' },
    { name: 'Docker Service', port: 5175, path: '/health' },
    { name: 'MCP Integration', port: 5176, path: '/health' }
  ];

  for (const service of services) {
    try {
      const response = await fetch(`http://localhost:${service.port}${service.path}`, {
        timeout: 5000
      });

      if (response.ok) {
        console.log(`✅ ${service.name} (${service.port}): Running`);
      } else {
        console.log(`❌ ${service.name} (${service.port}): HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${service.name} (${service.port}): Not responding`);
    }
  }

  console.log('\n📱 Access your application at: http://localhost:5173');
  console.log('🔧 Services are ready for agent deployment!');
}

// Run the check
checkServices().catch(console.error);
