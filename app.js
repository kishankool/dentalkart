//jshint esversion:6
require('dotenv').config();
const express=require('express');
const bodyParser=require('body-parser');
const ejs=require('ejs');
const mongoose=require('mongoose');
const encrypt=require('mongoose-encryption');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const multer = require('multer');
const csv = require('fast-csv');

const app=express();

app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect('mongodb://localhost:27017/userDB',{useNewUrlParser: true});

const userSchema= new mongoose.Schema({
    email:String,
    password:String,    
});

userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:['password']});

const User=new mongoose.model('User',userSchema);

app.get('/',function(req,res){
    res.render('home');
});

app.get('/login',function(req,res){
    res.render('login');
});

app.get('/register',function(req,res){
    res.render('register');
});

app.post('/register',function(req,res){
    const newUser=new User({
        email:req.body.email,
        password:req.body.password, 
    });
    newUser.save()
    .then(()=>{ 
        res.render('datasheet');
    }).catch((err)=>{
    console.log(err);
});
});

app.post('/login',function(req,res){
    const username=req.body.username;
    const password=req.body.password;
    User.findOne({email:username})
    .then((foundUser)=>{
        if(foundUser.password==password){
            res.render('datasheet');
        }
    }).catch((err)=>{
            console.log(err);
    });
});

//database(student table) connection
const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "exceldb"
});

//multer config
var storage = multer.diskStorage({
    destination: (req, file, callBack) => {
        callBack(null, './uploads/')    
    },
    filename: (req, file, callBack) => {
        callBack(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

var upload = multer({
    storage: storage
});

app.post('/secrets', upload.single("import-csv"), (req, res) =>{
    console.log(req.file.path)
    uploadCsv(__dirname + '/uploads/' + req.file.filename);
    res.send("data imported")
});

function uploadCsv(uriFile){
    let stream = fs.createReadStream(uriFile);
    let csvDataColl = [];
    let fileStream = csv
        .parse()
        .on("data", function (data) {
            csvDataColl.push(data);
        })
        .on("end", function () {
            csvDataColl.shift();
            pool.getConnection((error,connection) => {
                if (error) {
                    console.error(error);   
                } else {
                    let query = 'INSERT INTO student (Name,Address,Institue,Course,Email) VALUES ?';
                    connection.query(query, [csvDataColl], (error, res) => {
                        console.log(error || res);
                    });
                }
            });
            fs.unlinkSync(uriFile) 
        });
  
    stream.pipe(fileStream);
}

app.listen(3000,function(){
    console.log('server has started at port 3000');
})
