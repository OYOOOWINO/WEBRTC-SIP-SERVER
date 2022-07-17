const router = require("express").Router()
const User = require("../Models/User")
const { body, validationResult } = require('express-validator')
// const mailer = require("../Controllers/SendMail")
const uuid = require("uuid")
const bcrypt = require("bcryptjs")
const dotenv = require("dotenv")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")

dotenv.config()
    // Register
router.post("/register", [body('username', 'username cannot be blank').notEmpty(),
        body('email', 'Email is not valid').isEmail().normalizeEmail({ remove_dots: false }),
        body('email', 'Email cannot be blank').notEmpty(),
        body('password', 'Password must be at least 4 characters long').isLength({ min: 5 })
    ],
    async(req, res, next) => {
//         console.log(req.body);
        try {
            // Check for validation errors
            var errors = validationResult(req);
            if (!errors.isEmpty()) {
//                 console.log(errors.array());
                return res.status(400).json(errors.array());
            }
//             console.log("Registering User");
            const userExist = await User.findOne({ email: req.body.email })
            if (userExist) {
                return res.status(409).json({ message: 'The email address already registered.' })
            };

            const user = await new User({
                username: req.body.username,
                email: req.body.email,
                password: bcrypt.hashSync(req.body.password, 8),
                confirmationCode: uuid.v1()
            })
            const registered = await user.save()
            if (registered) {
//                 mailer.signupEMail(registered.username, registered.email, registered.confirmationCode)
                return res.status(200).json({ message: 'Registration Successful' })
            } else {
                return res.status(500).json({ message: 'Registration Error' })
            }
        } catch (error) {
//             console.log(error);
        }
    })

// Login
router.post("/login", async(req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).send({ message: "Invalid email or Password." });
        }
        if (!user.confirmed) {
            return res.status(401).send({ message: "Account Not Acivated. Check Your Email for confirmation link." });
        }

        const passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
        if (!passwordIsValid) return res.status(401).send({ message: "Invalid Email or Password" });

        let token = jwt.sign({ id: user._id,name:user.username}, process.env.SECRET, {
            expiresIn: 86400 // expires in 24 hours
        });

        let userData = {}
         userData._id= user._id
         userData.email= user.email
         userData.authToken= token
         userData.username= user.username
         userData.contacts = user.contacts;
        res.status(200).send({ message: "Login Success", userData });
    } catch (error) {
        console.log(error);
    }
})

router.post("/confirmRegistration", async(req, res, next) => {
    try {
        const user = await User.findOne({ confirmationCode: req.body.confirmationCode })
        if (!user) {
            return res.status(404).send({ message: "org Not found." });
        }

        user.confirmed = true;
        const activated = await user.save();
        if (!activated) {
            res.status(500).send({ message: err });
            return;
        }
        return res.status(200).send({ message: "Account Confirmed." })
    } catch (error) {
        console.log(error);
    }
})

// Reset Request
router.post("/reset", async(req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email })
        if (!user) {
            return res.status(404).send({ message: "User Not found." });
        }
        //Generate and set password reset token
        user.generatePasswordReset();
        const updateToken = await user.save()
        if (!updateToken) {
            return res.status(500).send({ message: "Internal Error." });
        }

//         mailer.resetMail(user.username, user.email, user.resetPasswordToken)
        return res.status(200).send({ message: 'Check Your Email For RESET LINK' })

    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: 'internal Error' })
    }
})

router.post("/resetpwd", async(req, res, next) => {
    const user = await User.findOne({ resetPasswordToken: req.body.token, resetPasswordExpires: { $gt: Date.now() } })
    if (!user) return res.status(401).json({ message: 'Password reset token is invalid or has expired.' });

    //Set the new password
    user.password = bcrypt.hashSync(req.body.password, 8)
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // Save
    const saved = await user.save()
    if (!saved) return res.status(500).json({ message: err.message });
    // send email
//     mailer.pwdMail(saved.username, saved.email)
    res.status(200).json({ message: 'Your password has been updated.' });
})

//
router.post("/update", async(req, res, next) => {
    const vals = req.body
    const user = await User.findOne({ _id: req.body._id })
    if (!user) return res.status(401).json({ message: 'Error. You cannot make the change' });
    //Set the fields
    Object.entries(vals).forEach(([key, value]) => {
        user[key] = value
    });

    const update = await user.save()
    if (!update) return res.status(400).json({ message: 'Error. Chnages not saved' })
    res.status(200).json({ message: 'Your profile has been updated.', update })

})

router.post("/newcontact", async(req, res, next) => {
    const vals = req.body
    const user = await User.findOne({ _id: req.body._id })
    console.log(vals.contact_id);
     if (req.body._id == req.body.contact_id) return res.status(400).json({ message: 'Cannot be own contact' });

    if (!user) return res.status(401).json({ message: 'Error. You cannot make the change' });

    //contact exists
     const contact = await User.findOne({ _id: req.body.contact_id })
     if (!contact) return res.status(400).json({ message: 'User/Contact not registered' });
    //Set the fields
    let new_contact ={
        name:req.body.contact_name,
        id: req.body.contact_id
    };
 console.log(new_contact)
    let current_contacts = user.contacts;
    let user_exist = false;
    current_contacts.forEach(elem=> {
        if(elem.id == vals.contact_id){
           user_exist = true;
        }
//         console.log("User ID: ", typeof elem.id, typeof vals._id);
    })

    if(user_exist) return res.status(409).json({ message: 'Contact Exists'})
    user.contacts.push(new_contact);
    const update = await user.save();
    if (!update) return res.status(400).json({ message: 'Error. Chnages not saved' });
    res.status(200).json({ message: 'Contacts updated.',data:update });
})

module.exports = router
