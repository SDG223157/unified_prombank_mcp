#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setAdminUser() {
  const adminEmail = 'isky999@gmail.com';
  
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingUser) {
      console.log(`❌ User with email ${adminEmail} not found. Please create the user first.`);
      return;
    }

    // Update user to admin
    const updatedUser = await prisma.user.update({
      where: { email: adminEmail },
      data: { isAdmin: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isAdmin: true
      }
    });

    console.log('✅ Admin user set successfully:');
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
    console.log(`   Admin: ${updatedUser.isAdmin}`);
    console.log(`   User ID: ${updatedUser.id}`);
    
  } catch (error) {
    console.error('❌ Error setting admin user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminUser();
