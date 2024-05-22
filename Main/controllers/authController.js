const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const Users = require('../models/userModel');
const catchAsych = require('../utils/catchAsych');
const AppError = require('../utils/appError');


// eslint-disable-next-line arrow-body-style
const jwtToken = id => {
 return jwt.sign({ id }, process.env.JWT_SECRET, {
   expiresIn: process.env.JWT_EXPIRESIN,
 });
}
console.log(process.env.JWT_EXPIRESIN);
exports.signup = catchAsych(async (req, res, next) => {
  const newUser = await Users.create({
    role:req.body.role,
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt:req.body.passwordChangedAt
  });

  //here we r sending jwt token to the user first argu is payload object which contain all the data that we r going to store inside token and second argu is the secret key and the third argu is the options where inside we provide the expiresIN and many more if we want
  const tokenforsignup = jwtToken(newUser._id)

  res.status(200).json({
    status: 'Success',
    token:tokenforsignup,
    userdata: {
      user: newUser,
    },
  });
});


exports.login = catchAsych(async (req,res,next) =>{
    const{email , password} = req.body;

    //check if the email and password exist
    if(!email || !password)
        {
            return next(new AppError("Your email or password is incorrect" ,  400))
        }
    
    //check the user exist and the password is correct    
    const user = await Users.findOne({email}).select('+password');
    console.log('user details',user);
    //const correct = await user.correctPassword(password , user.password);

    if(!user || !(await user.correctPassword(password , user.password))) 
    {
      return next(new AppError("Invalid password or email" , 401))
    }
    
    //If everthing is ok then send a Token
    const token = jwtToken(user._id);
    res.status(200).json({
        status:'Sccuess',
        token
    })    
})

exports.protect = catchAsych(async (req, res , next) => {
//Getting token and check of its there
let token
if(req.headers.authorization && req.headers.authorization.startsWith('Bearer'))
  {
    token = req.headers.authorization.split(' ')[1];
  }

  if(!token){
    return next(new AppError('You are not logged in! PLease login to get access.' , 401))
  }

//Verification
const decoded = await promisify(jwt.verify)(token , process.env.JWT_SECRET);
console.log(decoded);

//Check if User still exist
const currentUser = await Users.findById(decoded.id);
if(!currentUser){
  return next(new AppError('The user belonging to this token does no longer exist',401))
}

//check if the user changed password after the token was issued
   if(currentUser.PasswordChanged(decoded.iat))
   {
    return next(new AppError('User recently changed the password! please login again'))
   }

   //Grant access to protected route
   req.body = currentUser // if we wan to pass data from one middleware to other we have to send that data through this req body only so that is y we r assigning/adding current user to req body object 
  next()
} )


//since we r passing  para to this fucntion middle will not receive any paramters no to get acces to the that params we just wrapped the middle inside a fucntion and got the roles as para to the outer function and the due to closure will get acces to the roles😉.
// eslint-disable-next-line arrow-body-style
exports.restrictTo = (...roles) =>{
 return (req , res , next) => {
  //roles[admin , lead-guide].role = user
   //here roles will be accssibel becauseof closure.
   if(!roles.includes(req.body.role)){
    return next(new AppError('you do not have permission to do this action',403))
   }
    next()
 }
}