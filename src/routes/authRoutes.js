const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/database");

const router = express.Router();

// Register endpoint
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user exists
    const existingUser = await db("users").where({ email }).first();
    if (existingUser) {
      return res.status(400).json({ error: "Bu email zaten kayıtlı" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [user] = await db("users")
      .insert({
        fullName,
        email,
        password: hashedPassword,
      })
      .returning(["id", "email", "fullName"]);

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Kayıt işlemi başarısız" });
  }
});

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await db("users").where({ email }).first();
    if (!user) {
      return res.status(400).json({ error: "Kullanıcı bulunamadı" });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Geçersiz şifre" });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Giriş işlemi başarısız" });
  }
});

module.exports = router;
