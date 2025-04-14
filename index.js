import dotenv from "dotenv"
dotenv.config();

import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import helmet from "helmet"
import studentRoutes from "./routes/studentRoutes.js"
import adviserRoutes from "./routes/adviserRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());

// Routes - remove duplicates and keep only these
app.use('/api/students', studentRoutes);
app.use('/api/advisers', adviserRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
const MONGOURL = process.env.MONGO_URL;

mongoose
    .connect(MONGOURL)
    .then(() => {
        console.log("Connected to MongoDB successfully.")
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`)
        })
    })
    .catch((error) => console.log(error))

