const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const UsersModel = require("../../models/Users/UsersRegister")
const validator = require("validator")
const crypto = require("crypto")
const { sendVerificationMailUsers } = require("../../utils/senderVerificationMail/senderVerificationMailUser")
require('dotenv').config();
const keyJwt = process.env.KEY_JWT

const createToken = async (userInfo)=>{
    const token = await jwt.sign(userInfo,keyJwt,{expiresIn: "3d",});
    return token
    }

    const registerUser = async (req , res)=>{

        const {username , password, repeat_password , email } =req.body;

        try {
            const lowercaseEmail =await email.toLowerCase();
            let user = await UsersModel.findOne({email : lowercaseEmail })
            let isUsername = await UsersModel.findOne({username})

            if(user) return res.status(400).json({
                message : "User already exist"
            })

            if(isUsername){
                return res.status(400).json({
                  message: "Username already exist"
                })
              }

            user = new UsersModel({username,password,email : lowercaseEmail, token_email: crypto.randomBytes(64).toString("hex")});

            if(  !username || !password || !repeat_password  || !email ){

                res.status(400).json({
                    message : "All fields are required"
                })
            }
            if(!validator.isEmail(lowercaseEmail)){
                
                res.status(400).json({
                    message :"Email must be a valid email"
                })
            }
            if (password.length < 8) {

                res.status(400).json({
                    message :"the password must be at least 8 characters long"
                })
              }
              if (password !== repeat_password) {
                res.status(400).json({
                    message :"the password doesn't match with repeat password"
                })
              
              }

              const salt = await bcrypt.genSalt(10)
              const hashedPassword = await bcrypt.hash(user.password , salt.toString() )
              user.password = hashedPassword;

              await user.save()

              sendVerificationMailUsers(user)

              const userInfos = { id: user._id, username, email : lowercaseEmail, is_verified : user.is_verified , registration_date:user.registration_date }
              

              const token =await createToken(userInfos)

              res.status(200).json({ userInfos , token})

        } catch (error) {
            console.error(error)
            res.status(500).json(error.message)
        }

    }

    const loginUser = async (req , res)=>{

        const {email , password} = req.body;

        try {
            const lowercaseEmail = await email.toLowerCase()
            let user = await UsersModel.findOne({email : lowercaseEmail})

            if(!user) return res.status(400).json({message:"Invalid email or password"} )
          

            const validPassword = await bcrypt.compare(password , user.password.toString());
            console.log(user);
            if(!validPassword) return res.status(400).json({message:"Invalid email or password"})
            if(!user.is_verified) return res.status(201).json({message:"You have not verified your email"})

            const userInfos = { id: user._id,username : user.username , email:user.email,is_verified:user.is_verified , registration_date:user.registration_date , discounts_eyeRoll:user.discounts_eyeRoll}
              

            const token =await createToken(userInfos)

            res.status(200).json({userInfos,token})

        } catch (error) {
            
            console.error(error)
            res.status(500).json(error.message)
        }

    }

    const updateInformation = async (req , res)=>{

        const userID = req.headers.authorization;
        const {username, password, email} = req.body;

        try {
           
            let user = await UsersModel.findById(userID);
            if(!user){
                return res.status(400).json({
                    message: 'User not found',
                  });
            }
          
           if(username) user.username = username;
             if(email){
                const lowercaseEmail = await email.toLowerCase()
                user.email = lowercaseEmail;
             } 
         
            
            let hashedPassword;
            if(password){
                const salt = await bcrypt.genSalt(10)
                hashedPassword = await bcrypt.hash(password, salt);
                user.password = hashedPassword;
            }
           

            await user.save()
            const userInfos = {
                id: user._id,
                username,
                email : user.email,
                password: password ? hashedPassword : user.password,
                discounts_eyeRoll:user.discounts_eyeRoll
              };
              
              const token = await createToken(userInfos)

            res.status(200).json({userInfos, token });
    
        } catch (error) {
            console.error(error)
            res.status(500).json(error.message)
        }

    
    }


    const resendEmailVerification =async (req , res)=>{
        const {email , password} = req.body;

        try {
            const lowercaseEmail = email.toLowerCase()
            let user = await UsersModel.findOne({email : lowercaseEmail})
            if(!user) return res.status(400).json({message: "Invalid email or password"})

            const validPassword = await bcrypt.compare(password , user.password.toString());
            
            if(!validPassword) return res.status(400).json({message: "Invalid email or password"})

            if(user.is_verified){
            res.status(400).json({message: "The user has been verified with this email"} )
            }
            
            res.status(200).json({message: "we sent an email to you"} )
            sendVerificationMailUsers(user)
        } catch (error) {
            console.error(error)
            res.status(500).json(error.message)
        }
    }

 

    const findeUser = async (req , res)=>{

        const userId = req.params.userId

        try {
            const user = await UsersModel.findById({userId})
            res.status(200).json(user)
        } catch (error) {
            res.status(500).json(error)
        }
    }


    const getAllUser = async (req , res)=>{
        try {
            const users = await UsersModel.find({});
            res.status(200).json(users)
        } catch (error) {
            res.status(500).json(error)
        }
    }

    const verifyEmail = async (req , res)=>{
        try {
            
          const token_email = req.body.token_email;
        
          if(!token_email) return res.status(404).json({message:"email token not found ..."})
          
          const user = await UsersModel.findOne( {token_email} )
        
          if(user){
            user.token_email = null;
            user.is_verified = true;
            
            await user.save()

            const userInfos = { id: user._id, username : user.username , email:user.email , is_verified:user.is_verified , registration_date:user.registration_date , discounts_eyeRoll:user.discounts_eyeRoll }
        
            const token = await createToken(userInfos)
        
           await res.status(200).json({
              userInfos,
              token,
            })
          } else{
            res.status(404).json({message:"Emial verification failed, invalid token"})
          }
        
        } catch (error) {
          console.error(error)
          res.status(500).json(error.message)
        }
        }

        const getMe = async (req , res)=>{

            try {
                const token = req.header("Authorization")
                jwt.verify(token , keyJwt , (err , decoded)=>{
                    if(err) {
                        console.error(err.message)
                        return res.status(400).json({message:"token is empty or invalid"})
                    }else{
                        res.json(decoded);
                    }
                } )
            } catch (error) {
                console.error(error)
                res.status(500).json(error.message)
            }
        }

        const isPassword = async (req, res) => {
            const { password } = req.body;
            const userID = req.headers.authorization;
          
            try {
              let user = await UsersModel.findById(userID);
          
              if (!user) {
               
                return res.status(400).json({ message: "Your password is incorrect" });
              }
          
              const comparePassword = await bcrypt.compare(password, user.password);
          
              if (comparePassword) {
                res.status(200).json(true);
              } else {
                res.status(200).json(false);
              }
            } catch (error) {
              console.error(error);
              res.status(500).json(error.message);
            }
          };

     

        const getDiscountEyeRoll = async (req, res) => {
            const userID = req.headers.authorization;
            const { id, discount, endTime, startTime , address , brandName , workPhone , validDate , businessOwnerId } = req.body;
          
            try {
              if (!userID) {
                return res.status(400).json({
                  message: "user id not found",
                });
              }
          
              const discountsInfo = { id, discount, endTime, startTime , address , brandName , workPhone , validDate , businessOwnerId };
              const user = await UsersModel.findById(userID);
          
              if (!user) {
                return res.status(404).json({
                  message: "User not found",
                });
              }
          
           
              await UsersModel.findByIdAndUpdate(
                userID,
                {
                  $push: {
                    discounts_eyeRoll: discountsInfo,
                  },
                },
                { new: true } 
              );
          
              const updatedUser = await UsersModel.findById(userID);
          
              const userInfos = {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                is_verified: updatedUser.is_verified,
                registration_date: updatedUser.registration_date,
                discounts_eyeRoll: updatedUser.discounts_eyeRoll,
              };
              
              const token = await createToken(userInfos)
              return res.status(200).json({userInfos,token});
            } catch (error) {
              console.error(error);
              return res.status(500).json({
                message: "Internal server error",
              });
            }
          };



          
          const removeExpireDisCountsEyeRoll = async(req , res)=>{

            const userID = req.headers.authorization;
            const {dicountIds} = await req.body

            console.log( "discountId" , dicountIds);

            try {

              if(!userID){
                return res.status(400).json({
                  message:"user id not found"
                })
              }

              const user = await UsersModel.findById(userID)
              console.log(user);
              let discounts = await user.discounts_eyeRoll

            const updatedDiscounts = discounts.filter(discount => !dicountIds.includes(discount.id));
            
            user.discounts_eyeRoll = updatedDiscounts;
            await user.save();

            const userInfos = {
              id: user._id,
              username: user.username,
              email: user.email,
              is_verified: user.is_verified,
              registration_date: user.registration_date,
              discounts_eyeRoll: updatedDiscounts,
            };
              
            const token = await createToken(userInfos)
            return res.status(200).json({userInfos,token});
            } catch (error) {
              console.error(error);
              return res.status(500).json({
                message: "Internal server error",
              });
            }
          }

          
          const changePasswordForgot = async (req , res)=>{
          
            const {new_password , repeat_new_password , username , email}=req.body
            try {
              const user = await UsersModel.findOne({username , email : email.toLowerCase()})
              if(!user){
                return res.status(400).json({
                   message: 'username or email is not correct'
                });
              }

              if(new_password !== repeat_new_password){
                return res.status(400).json({
                  message: "the password doesn't match with repeat password"
                })
              }

              let hashedPassword;
              if(new_password){
                  const salt = await bcrypt.genSalt(10)
                  hashedPassword = await bcrypt.hash(new_password, salt);
                  user.password = hashedPassword;
              }

             await user.save()

           return  res.status(200).json({
              message : "your password set seccessfully"
             })
             
            } catch (error) {
              console.log(error);
              return res.status(500).json({
                message: "Internal server error",
              });
            }

          }

        module.exports = {
            registerUser,
            loginUser,
            findeUser,
            getAllUser,
            verifyEmail,
            getMe,
            resendEmailVerification,
            updateInformation,
            isPassword,
            getDiscountEyeRoll,
            removeExpireDisCountsEyeRoll,
            changePasswordForgot
        }




