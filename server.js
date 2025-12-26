const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs");
require("dotenv").config();
const app = express();
app.use(cors());
app.use(express.json());
const jwt = require("jsonwebtoken");


mongoose.connect("mongodb+srv://karansharma:kransiar@cluster0.umieigv.mongodb.net/?appName=Cluster0/karan")
  .then(() => console.log("Mongodb connected"))
  .catch((err) => console.log(err));

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: {
    type: String,
    enum: ["teacher", "student"],
    required: true
  },
  marks: { // NEW FIELD
    math: { type: Number, default: 0 },
    computer: { type: Number, default: 0 },
    physics: { type: Number, default: 0 },
    english: { type: Number, default: 0 },
    electronics: { type: Number, default: 0 }
  }
});
const User = mongoose.model("users", userSchema)

// middleware

const auth = (role) => (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token" });
  }
  try {
    const decoded = jwt.verify(token, "SECRET_KEY");
    if (decoded.role !== role) {
      return res.status(403).json({ message: "Access denied" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

app.get("/students", auth("teacher"), async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).select("-password");
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete
app.delete("/students/:id", auth("teacher"), async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.role !== "student") return res.status(403).json({ message: "Cannot delete non-student" });

    await student.deleteOne();
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Register
app.post("/register", async (req, res) => {
  const { email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    email,
    password: hashedPassword,
    role
  });
  await user.save();
  res.json({ message: "User registered" });
})

// Recieve login
app.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Incorrect Password" })

    if (user.role !== role) {
      return res.status(401).json({ message: "Role does not match" })
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      "SECRET_KEY",
      { expiresIn: "1d" }
    );

    res.json({ token });
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }

});

app.get("/teacher", auth("teacher"), (req, res) => {
  res.json({
    message: "Welcome Teacher",
    user: req.user
  });
});

// Get the logged-in student's info including marks
app.get("/student", auth("student"), async (req, res) => {
  try {
    const student = await User.findById(req.user.id).select("-password"); // Exclude password
    if (!student) return res.status(404).json({ message: "Student not found" });

    res.json(student); // ✅ Return email + marks
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// for getting the information to the marks page
app.get("/students/:id",auth("teacher"),async (req,res)=>{
  try{
    const student = await  User.findById(req.params.id).select("-password")
     if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } 
  catch(err){
    res.status(500).json({message:"Server Error"})

  }
})

// route to the marks updated
app.put("/students/:id/marks",auth("teacher"),async(req,res)=>{
  try{
    const  student = await User.findById(req.params.id);
  if (!student) return res.status(404).json({ message: "Student not found" });

student.marks ={...student.marks.toObject(), ...req.body.marks};
await student.save();
res.json({message:"Marsk updated successfully",student})
  }
  catch{
     res.status(500).json({ message: "Server error" });
  }
})

const PORT = process.env.PORT || 4004; // use Render's PORT or fallback to 4004 locally
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});




