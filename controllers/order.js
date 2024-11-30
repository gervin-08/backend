// order.js

const User = require("../models/User.js");
const Order = require("../models/Order.js");
const Product = require("../models/Product.js");
const bcrypt = require("bcrypt");
const auth = require("../auth.js");

// Order Controller

// Create a new order (shopping cart)
module.exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const cartItems = req.body || [];
    let totalAmount = 0;
    const populatedProducts = [];
    const wrongProductIds = [];

    for (const item of cartItems) {
      const productDetails = await Product.findById(item.productId);

      if (productDetails) {
        totalAmount += productDetails.price * item.quantity;

        populatedProducts.push({
          productId: item.productId,
          productName: productDetails.name,
          quantity: item.quantity,
        });
      } else {
        wrongProductIds.push(item.productId);
      }
    }

    if (wrongProductIds.length > 0) {
      return res.status(400).json({
        error: "Some product IDs are invalid or not found.",
        wrongProductIds: wrongProductIds,
      });
    }

    const newOrder = new Order({
      userId: userId,
      firstName: user.firstName,
      lastName: user.lastName,
      products: populatedProducts,
      totalAmount: totalAmount,
      status: "pending",
    });

    const savedOrder = await newOrder.save();

    for (const item of cartItems) {
      const productDetails = await Product.findById(item.productId);

      if (productDetails) {
        productDetails.quantity -= item.quantity;
        await productDetails.save();
      }
    }

    return res.status(201).json({
      message: "Order created successfully.",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message, // Add the error message to the response
    });
  }
};

// Checkout an order (change status to "processing")
module.exports.checkoutOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const pendingOrder = await Order.findOne({
      userId: userId,
      status: "pending",
    });

    if (!pendingOrder) {
      return res.status(404).json({ error: "Pending order not found" });
    }

    for (const productInfo of pendingOrder.products) {
      const productId = productInfo.productId;
      const purchasedQuantity = productInfo.quantity;
      const product = await Product.findById(productId);

      if (!product) {
        return res
          .status(404)
          .json({ error: `Product with ID ${productId} not found` });
      }

      if (product.quantity < purchasedQuantity) {
        return res.status(400).json({
          error: `Insufficient quantity for product with ID ${productId}`,
        });
      }

      product.quantity -= purchasedQuantity;
      await product.save();
    }

    pendingOrder.status = "processing";
    await pendingOrder.save();

    return res.status(200).json({ message: "Order checked out successfully" });
  } catch (error) {
    console.error("Error checking out the order:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Retrieve authenticated user's orders
module.exports.getUserOrders = async (req, res) => {
  try {
    const userOrders = await Order.find({ userId: req.user.id });
    return res.status(200).json(userOrders);
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Retrieve all orders (admin only)
module.exports.getAllOrders = async (req, res) => {
  if (req.user.isAdmin) {
    try {
      const allOrders = await Order.find();
      return res.status(200).json(allOrders);
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    return res.status(403).json({
      auth: "Failed",
      message: "Action Forbidden. Admin access required.",
    });
  }
};

// Add to cart
module.exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.id;
    const cartOrder = await Order.findOne({ userId, status: "pending" });

    if (!cartOrder) {
     return res.status(404).json({ error: "Error: Please logout and log back-in and start shopping!" });
    }

    const productDetails = await Product.findById(productId);

    if (!productDetails) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (cartOrder.status === "pending") {
      const newProduct = {
        productId: productId,
        productName: productDetails.name,
        quantity: quantity,
      };
      cartOrder.products.push(newProduct);
      cartOrder.totalAmount += quantity * productDetails.price;

      await cartOrder.save();

      return res
        .status(201)
        .json({ message: "Product added to cart successfully" });
    } else {
      return res.status(400).json({ error: "Cannot add to a non-pending order" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update cart
module.exports.updateCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.id;
    const cartOrder = await Order.findOne({ userId, status: "pending" });

    if (!cartOrder) {
      return res.status(404).json({ error: "Pending cart not found" });
    }

    const productToUpdate = cartOrder.products.find(
      (product) => product.productId.toString() === productId
    );

    if (productToUpdate) {
      const productDetails = await Product.findById(productId);

      if (!productDetails) {
        return res.status(404).json({ error: "Product not found" });
      }

      productToUpdate.quantity = quantity;
      cartOrder.totalAmount = cartOrder.products.reduce((total, product) => {
        return total + product.quantity * productDetails.price;
      }, 0);

      await cartOrder.save();

      return res.status(200).json({
        message: "Cart updated successfully",
        cartOrder,
      });
    } else {
      return res.status(404).json({ error: "Product not found in cart" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Remove product from cart
module.exports.removeFromCart = async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.user.id;
    const cartOrder = await Order.findOne({ userId, status: "pending" });

    if (!cartOrder) {
      return res.status(404).json({ error: "Pending cart not found" });
    }

    const productToRemoveIndex = cartOrder.products.findIndex(
      (product) => product.productId.toString() === productId
    );

    if (productToRemoveIndex !== -1) {
      const productToRemove = cartOrder.products[productToRemoveIndex];
      const productDetails = await Product.findById(productId);

      if (!productDetails) {
        return res.status(404).json({ error: "Product not found" });
      }

      cartOrder.products.splice(productToRemoveIndex, 1);
      cartOrder.totalAmount -= productToRemove.quantity * productDetails.price;

      if (productToRemove.quantity <= 0) {
        cartOrder.products.pull(productToRemove._id);
      }

      await cartOrder.save();

      return res
        .status(200)
        .json({ message: "Product removed from cart successfully" });
    } else {
      return res.status(404).json({ error: "Product not found in cart" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get order status by order ID (admin only)
module.exports.getOrderStatus = async (req, res) => {
  if (req.user.isAdmin) {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      return res.status(200).json({ status: order.status });
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    return res.status(403).json({
      auth: "Failed",
      message: "Action Forbidden. Admin access required.",
    });
  }
};

// Update order status (admin only)
module.exports.updateOrderStatus = async (req, res) => {
  try {
    const { newStatus } = req.body;
    const orderId = req.params.orderId;
    const statusTransitions = {
      pending: ["processing"],
      processing: ["packing"],
      packing: ["in transit"],
      "in transit": ["delivered"],
    };
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status === "delivered") {
      return res.status(403).json({
        error: "Order has been delivered and cannot be edited",
      });
    }

    if (!statusTransitions[order.status]) {
      return res.status(400).json({ error: "Invalid current status" });
    }

    if (statusTransitions[order.status].includes(newStatus)) {
      order.status = newStatus;
      await order.save();
      return res.status(200).json(order);
    } else {
      return res.status(400).json({
        error: "Invalid status transition",
        validTransitions: statusTransitions[order.status],
      });
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Retrieve authenticated user's pending cart
module.exports.getMyCart = async (req, res) => {
  try {
    const pendingCart = await Order.findOne({
      userId: req.user.id,
      status: "pending",
    });

    res.json(pendingCart);
  } catch (error) {
    console.error("Error fetching pending cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Clear cart (non-admin only)
module.exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Clear Cart Request Received for User ID:", userId);
    const cartOrder = await Order.findOne({ userId });

    if (!cartOrder) {
      console.log("Cart not found for User ID:", userId);
      return res.status(404).json({ error: "Cart not found" });
    }

    console.log("Clearing Cart for User ID:", userId);
    cartOrder.products = [];
    cartOrder.totalAmount = 0;
    await cartOrder.save();

    console.log("Cart cleared successfully for User ID:", userId);
    return res.status(200).json({ message: "Cart cleared successfully" });
  } catch (error) {
    console.error("Error clearing the cart:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
