require('dotenv').config({path: `${__dirname}/../.env`});
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const { result } = require('lodash');

const redirectUri = 'https://developers.google.com/oauthplayground'

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const refreshToken = process.env.REFRESH_TOKEN;
const accessToken = process.env.ACCESS_TOKEN;

const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
oAuth2Client.setCredentials({ refresh_token: refreshToken })


// sendMail should probably take the message body, subject, user email as the arguments.
async function sendMail(userMail, mailObject) {
    try {
        const accessToken = await oAuth2Client.getAccessToken()

        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: 'developer.ayok@gmail.com',
                clientId: clientId,
                clientSecret: clientSecret,
                refreshToken: refreshToken,
                accessToken: accessToken
            }
        })

        const mailOption = {
            from: 'Taskifyy <developer.ayok@gmail.com>',
            to: userMail,
            subject: mailObject.subject,
            text: mailObject.text,
            html: mailObject.html
        }

        const mail = await transport.sendMail(mailOption)
        return mail

    } catch (error) {
        return error
    }
}

module.exports = {
    sendMail
};
