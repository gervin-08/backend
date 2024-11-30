const User = require('../models/User.js');
const bcrypt = require('bcrypt');
const auth = require('../auth.js');

// User Controller

// Check if an email already exists
module.exports.checkEmail = (req, res) => {
  const emailToCheck = req.body.email;

  User.find({ email: emailToCheck })
    .then((result) => {
      if (result.length > 0) {
        res.status(400).json({ emailExists: 'Email already exists!' });
      } else {
        res.status(200).json({ emailExists: false });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
};

// User Registration
module.exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, mobileNo, password } = req.body;

    // Validate email format
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Email is invalid' });
    }

    // Validate mobile number length
    if (!/^\d{11}$/.test(mobileNo)) {
      return res.status(400).json({ error: 'Mobile number must be 11 digits' });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Create a new user instance
    const newUser = new User({
      firstName,
      lastName,
      email,
      mobileNo,
      password: bcrypt.hashSync(password, 10),
    });

    // Save user and send a success response
    const result = await newUser.save();
    return res.status(201).json({
      message: 'Registered successfully!',
      user: result,
    });
  } catch (err) {
    console.error('Error in registration:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// User login/authentication
module.exports.loginUser = (req, res) => {
  User.findOne({ email: req.body.email })
    .then((result) => {
      console.log(result);
      if (result == null) {
        return res.status(400).json({ error: 'Invalid credentials' });
      } else {
        const isPasswordCorrect = bcrypt.compareSync(
          req.body.password,
          result.password
        );
        if (isPasswordCorrect) {
          return res.status(200).json({ 
            success: true, 
            message: 'Login successful', 
            access: auth.createAccessToken(result) 
          });
        } else {
          return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    });
};


// Retrieve user details
module.exports.getProfile = (req, res) => {
  return User.findById(req.user.id)
    .then((user) => {
      if (user) {
        user.password = '';
        return res.status(200).send({ user });
      } else {
        return res.status(404).send({ error: 'User not found' });
      }
    })
    .catch((err) => {
      return res.status(500).send({ error: 'Failed to fetch user profile' });
    });
};

// Change user to admin (Admin Only)
module.exports.updateUserAsAdmin = async (req, res) => {
  const userIdToUpdate = req.params.userId;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userIdToUpdate,
      { isAdmin: true },
      { new: true }
    );

    if (!updatedUser) {
      return res.send('User not found');
    }

    return res.send('User updated as admin successfully');
  } catch (error) {
    console.error(error);
    return res.send('Failed to update user as admin');
  }
};

// Reset password
module.exports.resetPassword = async (req, res) => {
  const { id } = req.user;
  const { newPassword } = req.body;

  try {
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password in the database
    await User.findByIdAndUpdate(id, { password: hashedPassword });

    return res.status(200).json({ message: 'Password reset successful!' });
  } catch (error) {
    return res.status(500).json('Error resetting password!');
  }
};

// Update user profile
/*module.exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, mobileNo, address } = req.body;

    // Update the user's profile in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, mobileNo, address },
      { new: true }
    );

    res.json(updatedUser);
  } catch (error) {
    return res.send("Failed to update profile");
  }
};*/

// -------------------------------------------------------------
// Need Debugging:

module.exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, mobileNo, address } = req.body;

    // Find the user by ID
    const user = await User.findById(userId);

    // If user is not found, return an error response
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's profile in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, mobileNo, address },
      { new: true }
    );

    // Return the updated user
    res
      .status(200)
      .json({ message: 'Profile updated successfully!', user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ message: 'Failed to update profile' });
  }
};

exports.updateUserData = async (req, res) => {
  try {
    const { newEmail, newFirstName, newLastName, newPassword, newMobileNo } =
      req.body;

    const userId = req.user.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update email if provided
    if (newEmail) {
      user.email = newEmail;
    }

    // Update firstName if provided
    if (newFirstName) {
      user.firstName = newFirstName;
    }

    // Update lastName if provided
    if (newLastName) {
      user.lastName = newLastName;
    }

    // Update password if provided
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
    }

    // Update mobileNo if provided
    if (newMobileNo) {
      user.mobileNo = newMobileNo;
    }

    // Save the updated user data
    await user.save();

    // Fetch the updated user details
    const updatedUser = await User.findById(userId);

    // Return the complete updated user details in the response
    res.status(200).json({
      message: 'User data updated successfully',
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        mobileNo: updatedUser.mobileNo,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
