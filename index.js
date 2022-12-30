import express from 'express';
import ejs from "ejs";
import { initializeApp } from "firebase/app";
import http from 'http';
import { Server } from "socket.io";
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { async } from '@firebase/util';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import multer from 'multer';
import cors from 'cors';
const app = express();
const server = http.createServer(app);
const io = new Server(server);
import * as dotenv from 'dotenv';
dotenv.config()

const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    databaseURL: process.env.DATABASE_URL,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID
};

const app2 = initializeApp(firebaseConfig);

console.log(process.env.MONGODB_URL);
mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log("mongodb'ye bağlanıldı");
    }).catch((err) => {
        console.log(err);
    });

const userSchema = new mongoose.Schema({
    mail: {
        type: String,
        required: true,
        unique: true,
    },
    sifre: {
        type: String,
        required: true,
    },
    ad: {
        type: String,
        required: true,
        unique: true,
    },
    imgUrl: {
        type: String,
        required: true,
    },
    ed: {
        type: Boolean,
        required: true,
    }
})

userSchema.pre('save', async function (next) {
    const salt = await bcrypt.genSalt()
    this.sifre = await bcrypt.hash(this.sifre, 10)
    next()
})

const Users = new mongoose.model('user', userSchema)

server.listen(process.env.PORT || 8080, () => {
    console.log('server çalışıyor');
});

app.use(express.static('public'))
app.set('view engine', 'ejs')
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    if (req.cookies.userOturum == undefined) {
        res.render('index', { title: 'Anasayfa' })
    } else {
        res.redirect('/hesap')
    }
})

app.get('/kayit-ol', (req, res) => {
    if (req.cookies.userOturum == undefined) {
        res.render('kayit-ol', { title: 'Kayıt ol', hata: undefined })
    } else {
        res.redirect('/hesap')
    }
})

let userOturum = undefined;

app.post('/kayit-ol', (req, res) => {
    if (req.cookies.userOturum == undefined) {
        console.log(req.body)
        const user = new Users({
            mail: req.body.email,
            sifre: req.body.sifre,
            ad: req.body.ad,
            imgUrl: "https://cdn.jsdelivr.net/gh/Nurislam-Lord/images@main/user.png",
            ed: false,
        })
        user.save()
            .then((result) => {
                console.log('Kayıt olundu!');
                res.cookie('userOturum', result);
                res.redirect('/hesap')
            }).catch((err) => {
                console.log(err);
            });
    } else {
        res.redirect('/hesap')
    }
})

app.get('/giris-yap', (req, res) => {
    if (req.cookies.userOturum == undefined) {
        res.render('giris-yap', { title: 'Giriş yap', hata: undefined })
    } else {
        res.redirect('/')
    }
})

let hash = undefined

app.post('/giris-yap', async (req, res) => {
    if (req.cookies.userOturum == undefined) {
        console.log(req.body.email);
        await Users.findOne({ mail: req.body.email })
            .then(async (result) => {
                if (result) {
                    const vailedPass = await bcrypt.compare(req.body.sifre, result.sifre);
                    if (vailedPass) {
                        console.log('Giriş yapıldı!');
                        res.cookie('userOturum', result);
                        console.log(result);
                        res.redirect('/hesap')
                    } else {
                        res.render('giris-yap', { title: 'Giriş Yap', hata: 'Girdiğiniz e-posta veya şifre yanlış' })
                    }
                } else {
                    res.render('giris-yap', { title: 'Giriş Yap', hata: 'Girdiğiniz e-posta veya şifre yanlış' })
                }
            }).catch((err) => {
                console.log(err);
            });
    } else {
        res.redirect('/hesap')
    }

})

app.get('/hesap', (req, res) => {
    if (req.cookies.userOturum != undefined) {
        if (req.cookies.userOturum.ed == false) {
            res.redirect('/mail-dogurla')
        } else {
            Users.find({ ed: true })
                .then((result) => {
                    res.render('hesap', { title: 'Sohbet', user: req.cookies.userOturum, users: result })
                }).catch((err) => {
                    console.log(err);
                });
        }
    } else {
        res.redirect('/giris-yap')
    }
})

async function main() {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    let testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: '8E0A120BD200292EDC90C04EC7B3BF875713',
        },
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: '"Fred Foo 👻" <mail@mesaj.ga>', // sender address
        to: "nurislamlord@gmail.com", // list of receivers
        subject: "Hello ✔", // Subject line
        text: "Hello world?", // plain text body
        html: "<b>Hello world?</b>", // html body
    });

    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

app.get('/mail-dogurla', (req, res) => {
    if (req.cookies.userOturum != undefined) {
        if (req.cookies.userOturum.ed == true) {
            res.redirect('/hesap')
        } else {
            res.render('mail-dogurla', { title: 'Epostanı doğurla', hata: undefined, user: req.cookies.userOturum })
        }
    } else {
        res.redirect('/giris-yap')
    }

})

app.post('/mail-dogurla', (req, res) => {
    if (req.cookies.kod == req.body.kod) {
        Users.findOneAndUpdate({ _id: req.cookies.userOturum._id }, { ed: true }, { new: true })
            .then((result) => {
                res.clearCookie('userOturum')
                res.cookie('userOturum', result)
                res.redirect('/hesap')
            }).catch((err) => {
                console.log(err);
            });
    } else {
        res.send('eposta doğurlanamadı')
    }
})

app.get('/profil', (req, res) => {
    if (req.cookies.userOturum != undefined) {
        res.render('profil', { user: req.cookies.userOturum, title: 'Profil' })
    } else {
        res.redirect('/giris-yap')
    }
})

app.post('/profil', (req, res) => {
    if (req.cookies.userOturum != undefined) {
        Users.findOneAndUpdate({ _id: req.cookies.userOturum._id }, { ad: req.body.ad }, { new: true })
            .then((result) => {
                console.log(req.body.ad);
                res.clearCookie('userOturum')
                res.cookie('userOturum', result)
                res.send(req.cookies.userOturum)
            }).catch((err) => {
                console.log(err);
            });
    } else {
        res.redirect('/giris-yap')
    }
})

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('file');

app.post('/upload', upload, async (req, res) => {
    try {
        const file = req.file;
        const timestamp = Date.now();
        const name = file.originalname.split(".")[0];
        const type = file.originalname.split(".")[1];
        const fileName = `${name}_${timestamp}.${type}`;
        const imageRef = storage.child(fileName);
        const snapshot = await imageRef.put(file.buffer);
        const downloadURL = await snapshot.ref.getDownloadURL();

        res.send(downloadURL);
    } catch (error) {
        console.log(error)
        res.status(400).send(error.message);
    }
})

app.all('*', (req, res) => {
    res.render('404', { title: 'Sayfa bulunamadı (404)' })
});