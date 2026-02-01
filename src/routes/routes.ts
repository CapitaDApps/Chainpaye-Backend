import { Router, Request, Response } from "express";
import User from "../models/User";

const router = Router();



// Test MongoDB connection route
router.get("/db-test", async (req: Request, res: Response) => {
  try {
    // Create a test user
    const testUser = new User({
      name: "Test User",
      email: `test${Date.now()}@example.com`,
    });

    await testUser.save();

    // Get all users
    const users = await User.find().limit(5);

    res.json({
      success: true,
      message: "MongoDB connection working!",
      data: {
        newUser: testUser,
        allUsers: users,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "MongoDB connection failed",
      error: error.message,
    });
  }
});



export default router;
