import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import airRoutes from "./routes/airRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/air", airRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
