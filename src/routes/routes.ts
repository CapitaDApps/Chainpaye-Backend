import { Router, Request, Response } from "express";
import { CrossmintService } from "../sevices/crossmint.service";
import User from "../models/User";

const router = Router();

const crossmint = new CrossmintService(
  process.env.CROSSMINT_API_KEY as string,
);

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

router.get("/balances", async (req: Request, res: Response) => {
    console.log("Received request for wallet balances with query:", req.query);
  try {
    const { userId, chain, tokens } = req.query;

    if (!userId || !chain) {
      return res.status(400).json({
        error: "userId and chain are required",
      });
    }

    const tokenList = typeof tokens === "string"
      ? tokens.split(",")
      : undefined;

    const balances = await crossmint.getWalletBalancesInternal(
      userId as string,
      chain as string,
      tokenList,
    );

    res.json({
      success: true,
      data: balances,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;
