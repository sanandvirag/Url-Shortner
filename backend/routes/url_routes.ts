import express from "express";
import { createShortUrlController} from "../controllers/url_controller";
import { redirectUrl } from "../controllers/url_controller";
import { updateUrlExpiryController } from "../controllers/url_controller";
import { deleteShortUrlController } from "../controllers/url_controller";
import {getUserAnalyticsController} from "../controllers/url_controller"
import { optionalAuth } from "../middlewares/optional_auth_middleware";
import { authenticate } from "../middlewares/auth_middleware";

const router = express.Router();


router.post("/", optionalAuth, createShortUrlController);
router.get("/analytics", authenticate, getUserAnalyticsController);
router.get("/:shortCode", redirectUrl);
router.patch("/:id/expiry", authenticate, updateUrlExpiryController);
router.delete("/:id", authenticate, deleteShortUrlController);

export default router;