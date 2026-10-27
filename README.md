## BYC E-Commerce Backend
A RESTful API backend for the BYC online store, built with Node.js, Express, and MongoDB. It powers product browsing, customer management, cart operations, order processing with Paystack payment integration, user authentication.

## Table of Contents
- Features
- Tech Stack
- Project Structure
- API Reference
- Data Models
- Middleware
- Deployment

## Features

- JWT-based user authentication with admin role support
- Full CRUD operations for products, categories, customers, carts, and orders
- Paystack payment gateway integration
- Request validation using Joi on all input
- Password hashing with bcrypt
- CORS configured for production frontends and local development
- MongoDB connection with Mongoose ODM
- Auto-calculated cart totals and order totals via Mongoose pre-save hooks

## Tech Stack
- Node.js
- Express 5
- MongoDB + Mongoose
- JSON Web Token (JWT)
- Bcrypt
- Joi
- Axios
- Dotenv
- Config
- CORS
- Lodash

## Project structure
byc-ecommerce-backend/
├── config/
│   ├── default.json                    # Default config (JWT key placeholder)
│   └── custom-environment-variables.json  # Maps env vars to config keys
├── middleware/
│   ├── auth.js                         # Verifies JWT token
│   └── admin.js                        # Checks isAdmin flag on token
├── models/
│   ├── user.js                         # Admin/staff user model + JWT generation
│   ├── customer.js                     # Shopper/customer model
│   ├── category.js                     # Product category model
│   ├── product.js                      # Product model (embeds category)
│   ├── cart.js                         # Shopping cart model
│   └── order.js                        # Order model with Paystack fields
├── routes/                             # Route handlers 
│   ├── auth.js
│   ├── users.js
│   ├── categories.js
│   ├── products.js
│   ├── customers.js
│   ├── carts.js
│   └── orders.js
├── index.js                            # App entry point
├── package.json
└── .gitignore

## API Reference
All routes are prefixed with /api/byc-stores.
# Auth
POST - /user/register   # register user
POST - /auth/login      # login user
# Categories
GET - /category/get-all-categories          # Get all categories
POST - /category/add-new-category          # Create a new category
GET - /category/get-single-category/:id      # Get a single category
PUT - /category/update-category/:id        # Update a category
DELETE - /category/delete-category/:id        # Delete a category

# Customers
GET - /customer/get-all-customers          # Get all customers
GET - /customer/get-single-customer/:id       # Get a single customer
POST - /customer/add-new-customer           # Register a new customer
POST - /customer/upsert-customer           # Register if email doesnt exist on database
PUT - /customer/update-customer/:id        # Update customer info
DELETE - /customer/delete-customer/:id      # Delete a customer

# Cart 
POST - /cart          # Create a new cart

# Orders
GET - /order/get-all-orders       # Get all orders
POST - /order/create        # Place a new order
PUT - order/update-delivery-status/:id
PUT - order/update-payment-status/:id

## Getting Started

Node.js v18 or higher
MongoDB instance (local or MongoDB Atlas)
A Paystack account and secret key

Installation
bash 
# Clone the repository
git clone https://github.com/faustina857/byc-ecommerce-backend.git

# Navigate into the project directory
cd byc-ecommerce-backend

# Install dependencies
npm install
Environment Variables
Create a .env file in the root of the project and add the following:
env
- MongoDB connection string
- JWT private key 
- Paystack secret key (from your Paystack dashboard)
- FRONTEND_URL=https://byc-ecommerce-rpac.vercel.app

# Running the Server
bash 
# Start the server
npm start
The server runs on port 3001 by default, or uses the PORT environment variable if set.

---

## License

MIT