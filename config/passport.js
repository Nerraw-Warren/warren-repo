const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20");
const User = require("../models/user-model");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");

passport.serializeUser((user, done) => {
  console.log("Serialize使用者...");
  // console.log(user);
  done(null, user._id); //將mongoDB的ID存在session
  //將mongoDB的ID簽名過後，以 cookie 的形式給使用者
});

passport.deserializeUser(async (_id, done) => {
  console.log(
    "Deserialize使用者，使用SerailizeUser儲存的id，去找到資料庫裡的資料"
  );
  let foundUser = await User.findOne({ _id });
  done(null, foundUser);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8080/auth/google/redirect",
    },

    async (accessToken, refreshToken, profile, done) => {
      console.log("Enter google strategy region...");
      // console.log(profile);
      // console.log("===================");
      let foundUser = await User.findOne({ googleID: profile.id }).exec();
      if (foundUser) {
        console.log("此用戶已經註冊過了。無需新增至資料庫。");
        done(null, foundUser);
      } else {
        console.log("偵測到新用戶，需新增至資料庫。");
        let newUser = new User({
          name: profile.displayName,
          googleID: profile.id,
          thumbnail: profile.photos[0].value,
          email: profile.emails[0].value,
        });
        let savedUser = await newUser.save();
        console.log("成功創建新用戶。");
        done(null, savedUser);
      }
    }
  )
);

passport.use(
  new LocalStrategy(async (username, password, done) => {
    let foundUser = await User.findOne({ email: username });
    if (foundUser) {
      let result = bcrypt.compare(password, foundUser.password);
      if (result) {
        done(null, foundUser);
      } else {
        done(null, false);
      }
    } else {
      done(null, false); //false代表沒有被strategy驗證成功
    }
  })
);
