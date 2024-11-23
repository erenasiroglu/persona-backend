const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const db = require("../../db/database");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const authController = {
  // Kayıt olma
  async signup(req, res) {
    try {
      const { email, password, first_name, last_name } = req.body;

      // Email formatını kontrol et
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Geçersiz email formatı" });
      }

      // Şifre kurallarını kontrol et
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Şifre en az 6 karakter olmalıdır" });
      }

      // Email kullanımda mı kontrol et
      const existingUser = await db("users").where({ email }).first();
      if (existingUser) {
        return res.status(400).json({ error: "Bu email zaten kullanımda" });
      }

      // Şifreyi hashle
      const hashedPassword = await bcrypt.hash(password, 10);

      // Kullanıcıyı oluştur
      const [user] = await db("users")
        .insert({
          email,
          password: hashedPassword,
          first_name,
          last_name,
        })
        .returning(["id", "email", "first_name", "last_name"]);

      // Token oluştur
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(201).json({
        message: "Kayıt başarılı",
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
        token,
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Kayıt sırasında bir hata oluştu" });
    }
  },

  // Giriş yapma
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Kullanıcıyı bul
      const user = await db("users").where({ email }).first();
      if (!user) {
        return res.status(401).json({ error: "Email veya şifre hatalı" });
      }

      // Şifreyi kontrol et
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Email veya şifre hatalı" });
      }

      // Token oluştur
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        message: "Giriş başarılı",
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Giriş sırasında bir hata oluştu" });
    }
  },

  // Şifre sıfırlama emaili gönderme
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Kullanıcıyı bul
      const user = await db("users").where({ email }).first();
      if (!user) {
        return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      }

      // Reset token oluştur
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 saat

      // Token'ı kaydet
      await db("users").where({ id: user.id }).update({
        reset_token: resetToken,
        reset_token_expires: resetTokenExpires,
      });

      // Reset emaili gönder
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await transporter.sendMail({
        to: email,
        subject: "Şifre Sıfırlama",
        html: `
          <p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>Bu link 1 saat sonra geçersiz olacaktır.</p>
        `,
      });

      res.json({ message: "Şifre sıfırlama linki emailinize gönderildi" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res
        .status(500)
        .json({ error: "Şifre sıfırlama sırasında bir hata oluştu" });
    }
  },

  // Şifre sıfırlama
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      // Token'a sahip kullanıcıyı bul
      const user = await db("users")
        .where("reset_token", token)
        .where("reset_token_expires", ">", new Date())
        .first();

      if (!user) {
        return res
          .status(400)
          .json({ error: "Geçersiz veya süresi dolmuş token" });
      }

      // Şifre kurallarını kontrol et
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Şifre en az 6 karakter olmalıdır" });
      }

      // Yeni şifreyi hashle
      const hashedPassword = await bcrypt.hash(password, 10);

      // Şifreyi güncelle ve token'ı temizle
      await db("users").where({ id: user.id }).update({
        password: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
      });

      res.json({ message: "Şifre başarıyla güncellendi" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Şifre güncellenirken bir hata oluştu" });
    }
  },
};

module.exports = authController;
