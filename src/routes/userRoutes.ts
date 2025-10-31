import { Router } from "express";
import { getUser, updateUser, deleteUser } from "../controllers/userController";
import { verifyToken } from "../middleware";

const router = Router();

router.get('/me', verifyToken, getUser);
router.put('/me', verifyToken, updateUser);
router.delete('/me', verifyToken, deleteUser);

export default router;