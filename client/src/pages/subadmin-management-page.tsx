import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserRole } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Ban, CheckCircle, UserPlus } from "lucide-react";

const createSubadminSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function SubadminManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof createSubadminSchema>>({
    resolver: zodResolver(createSubadminSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Fetch users that are subadmins
  const { data: subadmins = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
    select: (data) => data.filter((user: any) => user.role === UserRole.SUBADMIN),
    enabled: !!user && user.role === UserRole.ADMIN,
  });

  // Create subadmin mutation
  const createSubadminMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createSubadminSchema>) => {
      const res = await apiRequest("POST", "/api/register", {
        ...data,
        role: UserRole.SUBADMIN,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Subadmin created",
        description: "The subadmin account has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create subadmin",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Block subadmin mutation
  const blockSubadminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/block`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Subadmin blocked",
        description: "The subadmin has been blocked successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to block subadmin",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unblock subadmin mutation
  const unblockSubadminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/unblock`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Subadmin unblocked",
        description: "The subadmin has been unblocked successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unblock subadmin",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof createSubadminSchema>) => {
    createSubadminMutation.mutate(data);
  };

  const handleBlockSubadmin = (userId: number) => {
    blockSubadminMutation.mutate(userId);
  };

  const handleUnblockSubadmin = (userId: number) => {
    unblockSubadminMutation.mutate(userId);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto pt-0 lg:pt-0">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Subadmin Management</CardTitle>
                  <CardDescription>
                    Create and manage subadmin accounts
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-primary to-blue-500"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Subadmin
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subadmins.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4">
                            No subadmins found
                          </TableCell>
                        </TableRow>
                      ) : (
                        subadmins.map((subadmin: any) => (
                          <TableRow key={subadmin.id}>
                            <TableCell className="font-medium">
                              {subadmin.username}
                            </TableCell>
                            <TableCell>
                              {subadmin.isBlocked ? (
                                <Badge variant="destructive">Blocked</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                {subadmin.isBlocked ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnblockSubadmin(subadmin.id)}
                                    className="text-green-500 border-green-500/20 hover:bg-green-500/10"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Unblock
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBlockSubadmin(subadmin.id)}
                                    className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Block
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Create Subadmin Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subadmin</DialogTitle>
            <DialogDescription>
              Create a new subadmin account with management permissions
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSubadminMutation.isPending}>
                  {createSubadminMutation.isPending ? "Creating..." : "Create Subadmin"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
