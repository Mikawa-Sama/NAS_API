import { Router } from "express";
import { login, logout, refreshTokenEndpoint, register } from "../controllers/authController";

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshTokenEndpoint);

export default router;