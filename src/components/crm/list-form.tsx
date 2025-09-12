import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { CrmList } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
  type: z.enum(['contacts', 'leads', 'customers', 'prospects']),
  taskCompatible: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ListFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list?: CrmList | null;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export function ListForm({ 
  open, 
  onOpenChange, 
  list, 
  onSubmit, 
  isLoading = false 
}: ListFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "contacts",
      taskCompatible: true,
    },
  });

  useEffect(() => {
    if (list) {
      form.reset({
        name: list.name || "",
        description: list.description || "",
        type: list.type || "contacts",
        taskCompatible: list.taskCompatible ?? true,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        type: "contacts",
        taskCompatible: true,
      });
    }
  }, [list, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {list ? "Edit List" : "Create List"}
          </DialogTitle>
          <DialogDescription>
            {list ? "Update list information" : "Create a new list for organizing contacts or companies"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>List Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="High Priority Prospects" 
                      {...field} 
                      value={field.value || ""} 
                      data-testid="input-list-name" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the purpose of this list..."
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-list-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>List Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "contacts"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-list-type">
                        <SelectValue placeholder="Select list type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="contacts">Contacts</SelectItem>
                      <SelectItem value="leads">Leads</SelectItem>
                      <SelectItem value="customers">Customers</SelectItem>
                      <SelectItem value="prospects">Prospects</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the type of records this list will contain
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taskCompatible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-task-compatible"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Task Compatible
                    </FormLabel>
                    <FormDescription>
                      Allow this list to be used with automated tasks and form submissions
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />



            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                data-testid="button-save-list"
              >
                {isLoading ? "Saving..." : list ? "Update List" : "Create List"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}