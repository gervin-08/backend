// orders.js

const express = require("express");
const orderController = require("../controllers/order.js");
const auth = require("../auth.js");
const { verify, verifyAdmin } = auth;

const router = express.Router();

// Routes for handling orders

// Create a new order (Non-Admin Users)
router.post("/createOrder", verify, orderController.createOrder);

// Checkout an order (Change status to "processing")
router.post("/checkout", verify, orderController.checkoutOrder);

// Retrieve an authenticated user's pending order
router.get("/myCart", verify, orderController.getMyCart);

// Retrieve all orders of an authenticated user
router.get("/myOrders", verify, orderController.getUserOrders);

// Retrieve all orders (Admin Only)
router.get("/all", verify, verifyAdmin, orderController.getAllOrders);

// Get the status of an order by its ID (Admin Only)
router.get("/:orderId/status", verify, verifyAdmin, orderController.getOrderStatus);

// Update the status of an order
router.put("/:orderId/status", verify, verifyAdmin, orderController.updateOrderStatus);

// Cart functionalities

// Add a product to the cart
router.post("/addToCart", verify, orderController.addToCart);

// Update the cart
router.put("/myCart", verify, orderController.updateCart);

// Remove a product from the cart
router.delete("/removeFromCart/:productId", verify, orderController.removeFromCart);

// Clear the cart (Non-Admin Only)
router.delete("/clearCart", verify, orderController.clearCart);

module.exports = router;
