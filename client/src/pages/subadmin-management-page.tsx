import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserRole } from "@shared/schema";
import DashboardLayout from "@/components/dashboard-layout";
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
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Ban, CheckCircle, UserPlus, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const createSubadminSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  commissions: z.object({
    satamatka_single: z.string(),
    satamatka_jodi: z.string(),
    satamatka_patti: z.string(),
  }).optional(),
});

export default function SubadminManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showCommissionSettings, setShowCommissionSettings] = useState(false);

  const form = useForm<z.infer<typeof createSubadminSchema>>({
    resolver: zodResolver(createSubadminSchema),
    defaultValues: {
      username: "",
      password: "",
      commissions: {
        satamatka_single: "2.0",
        satamatka_jodi: "2.0",
        satamatka_patti: "2.0",
      },
    },
  });

  // Fetch users that are subadmins
  const { data: subadmins = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
    select: (data: any) => data.filter((user: any) => user.role === UserRole.SUBADMIN),
    enabled: !!user && user.role === UserRole.ADMIN,
  });

  // Create subadmin mutation
  const createSubadminMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createSubadminSchema>) => {
      // First create the subadmin account
      const res = await apiRequest("POST", "/api/register", {
        username: data.username,
        password: data.password,
        role: UserRole.SUBADMIN,
      });
      
      const newSubadmin = await res.json();
      
      // If commission settings are provided, set them up for the newly created subadmin
      if (data.commissions && showCommissionSettings) {
        const subadminId = newSubadmin.id;
        
        // Set up commission rates for different game types
        const commissionPromises = [
          apiRequest("POST", "/api/commissions/subadmin", {
            subadminId,
            gameType: "satamatka_single",
            commissionRate: parseFloat(data.commissions.satamatka_single) * 100 // Store as integer percentage
          }),
          apiRequest("POST", "/api/commissions/subadmin", {
            subadminId,
            gameType: "satamatka_jodi",
            commissionRate: parseFloat(data.commissions.satamatka_jodi) * 100
          }),
          apiRequest("POST", "/api/commissions/subadmin", {
            subadminId,
            gameType: "satamatka_patti",
            commissionRate: parseFloat(data.commissions.satamatka_patti) * 100
          })
        ];
        
        await Promise.all(commissionPromises);
      }
      
      return newSubadmin;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions/subadmin"] });
      setIsCreateDialogOpen(false);
      setShowCommissionSettings(false);
      form.reset();
      toast({
        title: "Subadmin created",
        description: "The subadmin account has been created successfully with commission settings",
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
    <DashboardLayout title="Subadmin Management">
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.location.href = `/subadmin-settings?id=${subadmin.id}`}
                              className="text-blue-500 border-blue-500/20 hover:bg-blue-500/10"
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Commission
                            </Button>
                            
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
              
              {/* Toggle for commission settings */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Commission Settings for Market Games</span>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCommissionSettings(!showCommissionSettings)}
                  className={showCommissionSettings ? "bg-primary/10" : ""}
                >
                  {showCommissionSettings ? "Hide Settings" : "Show Settings"}
                </Button>
              </div>
              
              {/* Commission settings section */}
              {showCommissionSettings && (
                <div className="space-y-4 pt-4 pb-2">
                  <Separator />
                  <h3 className="text-sm font-medium">Market Game Commission Rates</h3>
                  <p className="text-xs text-muted-foreground">Set commission percentages for Satamatka games</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="commissions.satamatka_single"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Single Digit</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input placeholder="2.0" {...field} className="max-w-[100px]" />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="commissions.satamatka_jodi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jodi (Pair)</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input placeholder="2.0" {...field} className="max-w-[100px]" />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="commissions.satamatka_patti"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patti (Panel)</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input placeholder="2.0" {...field} className="max-w-[100px]" />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <p className="text-xs text-muted-foreground pt-2">
                    These commission rates will determine how much the subadmin earns from player bets on these game types.
                  </p>
                </div>
              )}
              
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
    </DashboardLayout>
  );
}