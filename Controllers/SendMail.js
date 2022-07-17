const nodemailer = require("nodemailer");
const dotenv = require("dotenv")
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

dotenv.config()

const oauth2Client = new OAuth2(
    process.env.MAIL_CLIENT_ID,
    process.env.MAIL_CLIENT_SEC,
    "https://developers.google.com/oauthplayground"
);
const refreshToken = process.env.MAIL_REFRESH_TKN
oauth2Client.setCredentials({
    refresh_token: refreshToken
});

let newAccessToken = null

oauth2Client.getAccessToken().then((result)=>{
    newAccessToken = result.token;
    // console.log("RFR_TKN: ",newAccessToken);
})

const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.MAIL_USER,
                clientId: process.env.MAIL_CLIENT_ID,
                clientSecret: process.env.MAIL_CLIENT_SEC,
                refreshToken: process.env.REFRESH_TKN,
                accessToken: newAccessToken
            },
            tls: {
                rejectUnauthorized: false
            }
});

exports.signupEMail = (name, email, confirmationCode) => {
    let front_base_url = process.env.FRONT_URL;
    let route = "confirm"
    try {
        transport.sendMail({
            from: process.env.MAIL_USER,
            to: email,
            subject: "Please confirm your account",
            html: `<h1>Email Confirmation</h1>
          <h2>Hello ${name}</h2>
          <p>Thank you for Joining Us. Please confirm your email by clicking on the following link</p>
          <a href="${front_base_url}/${route}?code=${confirmationCode}"> Click here</a>
          </div>`,
        })

    } catch (err) {
        console.log(err);
    }
}

exports.resetMail = (name, email, code) => {
    try {
            transport.sendMail({
            from: process.env.MAIL_USER,
            to: email,
            subject: "Password Reset",
            html: `<h1>Password Reset</h1>
          <h2>Hello ${name}</h2>
          <p>You requested for a password change. Provide ${code} as the reset token</p>
          <p>If you did not request a password change ignore this email and your password will remain the same</p>
          </div>`,
        })

    } catch (err) {
        console.log(err);
    }
}

exports.pwdMail = (name, email) => {
    try {
        transport.sendMail({
            from: process.env.MAIL_USER,
            to: email,
            subject: "Password Changed",
            html: `<h1>Your Password Changed</h1>
          <h2>Hello ${name}</h2>
          <p>Your Password has been changed.</p>
          <p>If you did not change your password login and secure your account</p>
          </div>`,
        })

    } catch (err) {
        console.log(err);
    }
}
