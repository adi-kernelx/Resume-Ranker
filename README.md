# 📝 Resume Ranking System

A sophisticated web-based application that automatically ranks resumes based on company-specific preferences using advanced NLP techniques, machine learning, and modern web technologies.

## 🚀 Key Features

- **Intelligent Resume Parsing**: Extracts 9 key metrics including GPA, skills, projects, and experience using NLP
- **Weighted Scoring Algorithm**: Implements a sophisticated scoring system (35% skills, 25% education, 25% projects, 15% experience)
- **Real-time Ranking**: Automatically scores and ranks resumes against multiple companies simultaneously
- **Pattern Recognition**: Advanced text analysis for project detection and skill extraction
- **Responsive Dashboard**: Interactive UI for viewing candidate rankings and company-wise performance metrics

## 💻 Tech Stack

### Backend
- Node.js + Express.js
- Python (NLP, NLTK, spaCy, PyTorch)
- MongoDB
- RESTful APIs

### Frontend
- React.js
- Tailwind CSS
- Modern UI/UX Design

## 👥 Team Contributions

### Aditya Onam (@AdityaOnam)
**Role: Model Designer**
- Led the development of the weighted scoring algorithm
- Implemented the core ranking system architecture
- Data Collection
- Generate the data for model training

### Aditya Gupta (@code-epic-adi)
**Role: Data Engineer**
- Implemented resume data extraction and preprocessing
- Developed the PDF text extraction system
- Implemented data validation and cleaning processes
- Generate the data for model training

**Role: NLP Engineer**
- Developed the skill extraction system
- Implemented text similarity analysis
- Enhanced keyword extraction using TF-IDF
- Optimized NLP processing for better accuracy

**Role: Deployment Engineer**
- Developed the React.js frontend
- Implemented the real-time ranking dashboard
- Created responsive UI components
- Integrated NLP components with the Node.js backend
- Integrated MongoDB for efficient data storage

### Sarthak Kushwah
**Role: Fairness & Explainability Engineer**
- Implemented scoring transparency
- Developed ranking validation system
- Ensured fair evaluation across different resume formats
- Implemented error handling

## 🛠️ Setup Instructions

1. **Clone the Repository**
```bash
cd resume-ranking-system
```

2. **MongoDB Setup**
- Ensure MongoDB is installed and running on your system
- Create a `.env` file in the server root directory:
```
MONGO_URI=mongodb://localhost:27017/resume_ranking
```

3. **Backend Setup**
```bash
cd server
pip install -r requirements.txt
npm install
npm start
```

4. **Frontend Setup**
```bash
cd client
npm install
npm run dev
```

## 📊 Project Structure
```
resume-ranking-system/
├── client/                 # React frontend
├── server/                 # Node.js + Express backend
│   ├── python/            # Python scripts for resume parsing
│   ├── controllers/       # API controllers
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   └── services/         # Business logic
└── README.md
```

Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a pull request.



