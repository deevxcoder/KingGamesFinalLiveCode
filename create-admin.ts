// This script creates an admin user for the system
import { db } from "./server/db";
import { users, UserRole } from "./shared/schema";
import { hashPassword } from "./server/auth";
import { eq } from "drizzle-orm";

async function createAdminUser() {
  try {
    console.log("Creating admin user...");
    
    // Check if the admin user already exists
    const adminExists = await db.select()
      .from(users)
      .where(eq(users.username, "admin"))
      .limit(1);
      
    if (adminExists.length > 0) {
      console.log("Admin user already exists. Updating password...");
      
      // Hash the new password
      const hashedPassword = await hashPassword("admin123");
      
      // Update admin password
      await db.update(users)
        .set({ 
          password: hashedPassword,
          role: UserRole.ADMIN,
          balance: 1000000 // 10,000 in currency (stored in cents/paisa)
        })
        .where(eq(users.username, "admin"));
        
      console.log("Admin password updated successfully!");
    } else {
      console.log("Creating new admin user...");
      
      // Hash the password
      const hashedPassword = await hashPassword("admin123");
      
      // Insert the admin user
      await db.insert(users)
        .values({
          username: "admin",
          password: hashedPassword,
          role: UserRole.ADMIN,
          balance: 1000000, // 10,000 in currency (stored in cents/paisa)
          isBlocked: false
        });
        
      console.log("Admin user created successfully!");
    }
    
    // Create a test subadmin user
    const subadminExists = await db.select()
      .from(users)
      .where(eq(users.username, "subadmin"))
      .limit(1);
      
    if (subadminExists.length === 0) {
      console.log("Creating test subadmin user...");
      
      // Hash the password
      const hashedPassword = await hashPassword("subadmin123");
      
      // Insert the subadmin user
      await db.insert(users)
        .values({
          username: "subadmin",
          password: hashedPassword,
          role: UserRole.SUBADMIN,
          balance: 500000, // 5,000 in currency
          isBlocked: false
        });
        
      console.log("Subadmin user created successfully!");
    }
    
    console.log("User setup completed successfully!");
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();