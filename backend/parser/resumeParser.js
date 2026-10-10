
function parseResume(text) {
    const result = {
        name: null,
        qualification: null,
        experience: null,
        subjects: [],
        expertise: {}
    };

    if (!text || typeof text !== "string") {
        return result;
    }

    // =========================================
    // 1. CLEAN RESUME TEXT
    // =========================================

    const cleanText = text
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();

    const lines = cleanText
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const lowerText = cleanText.toLowerCase();

    // =========================================
    // HELPER FUNCTIONS
    // =========================================

    function escapeRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function unique(values) {
        return [...new Set(values)];
    }

    function cleanValue(value) {
        return value
            .replace(/^[\s:|\-–—]+/, "")
            .replace(/[\s:|\-–—]+$/, "")
            .trim();
    }

    function isHeading(line) {
        const headingWords = [
            "resume",
            "curriculum vitae",
            "cv",
            "profile",
            "personal details",
            "contact",
            "education",
            "qualifications",
            "experience",
            "work experience",
            "professional experience",
            "skills",
            "technical skills",
            "expertise",
            "subjects",
            "subjects and expertise",
            "subjects & expertise",
            "teaching experience",
            "teaching preferences",
            "certifications",
            "projects",
            "references",
            "declaration"
        ];

        const normalized = line
            .toLowerCase()
            .replace(/[:\-|]/g, "")
            .trim();

        return headingWords.includes(normalized);
    }

    // =========================================
    // 2. EXTRACT NAME
    // =========================================

    function extractName() {
        // Check explicit name labels first.
        for (const line of lines) {
            const match = line.match(
                /^(?:name|full name)\s*[:\-]\s*(.+)$/i
            );

            if (match && match[1].trim().length > 1) {
                return cleanValue(match[1]);
            }
        }

        // Ignore common heading and contact lines.
        const ignoredWords = [
            "resume",
            "curriculum vitae",
            "cv",
            "profile",
            "email",
            "phone",
            "mobile",
            "address",
            "linkedin",
            "github",
            "objective",
            "summary"
        ];

        for (const line of lines.slice(0, 10)) {
            const lowerLine = line.toLowerCase();

            if (isHeading(line)) continue;

            if (
                ignoredWords.some(word =>
                    lowerLine.includes(word)
                )
            ) {
                continue;
            }

            if (line.includes("@")) continue;

            if (/\d{5,}/.test(line)) continue;

            // Avoid long sentences.
            if (line.split(/\s+/).length > 6) continue;

            // A likely name usually contains alphabetic characters.
            if (!/[a-zA-Z]{2,}/.test(line)) continue;

            return cleanValue(line);
        }

        return null;
    }

    result.name = extractName();

    // =========================================
    // 3. EXTRACT QUALIFICATION
    // =========================================

    const qualificationPatterns = [
        /\bB\.?\s?Tech\b/gi,
        /\bM\.?\s?Tech\b/gi,
        /\bB\.?\s?E\.?\b/gi,
        /\bM\.?\s?E\.?\b/gi,
        /\bB\.?\s?Sc\b/gi,
        /\bM\.?\s?Sc\b/gi,
        /\bBCA\b/gi,
        /\bMCA\b/gi,
        /\bBBA\b/gi,
        /\bMBA\b/gi,
        /\bB\.?\s?Com\b/gi,
        /\bM\.?\s?Com\b/gi,
        /\bBA\b/gi,
        /\bMA\b/gi,
        /\bPh\.?\s?D\b/gi,
        /\bPhD\b/gi,
        /\bDiploma\b/gi,
        /\bBachelor(?:'s)?\b/gi,
        /\bMaster(?:'s)?\b/gi
    ];

    function extractQualification() {
        // Prefer lines inside education-related sections.
        const educationKeywords = [
            "education",
            "qualification",
            "academic background",
            "academic qualification",
            "degree"
        ];

        const educationLines = [];

        for (let i = 0; i < lines.length; i++) {
            const current = lines[i].toLowerCase();

            if (
                educationKeywords.some(keyword =>
                    current.includes(keyword)
                )
            ) {
                educationLines.push(lines[i]);

                for (
                    let j = i + 1;
                    j < Math.min(i + 5, lines.length);
                    j++
                ) {
                    educationLines.push(lines[j]);
                }
            }
        }

        const searchLines =
            educationLines.length > 0
                ? educationLines
                : lines;

        for (const line of searchLines) {
            for (const pattern of qualificationPatterns) {
                if (pattern.test(line)) {
                    return cleanValue(line);
                }

                // Reset global regex state.
                pattern.lastIndex = 0;
            }
        }

        return null;
    }

    result.qualification = extractQualification();

    // =========================================
    // 4. EXTRACT EXPERIENCE
    // =========================================

    const experiencePatterns = [
        /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:teaching\s*)?experience/i,

        /(?:teaching|professional|work)\s*experience\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,

        /worked\s+(?:as|for)\s+.*?(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i
    ];

    function extractExperience() {
        for (const pattern of experiencePatterns) {
            const match = cleanText.match(pattern);

            if (match) {
                return Number(match[1]);
            }
        }

        // Handle phrases such as:
        // "Since 2020"
        // "Teaching from 2019 to present"
        const sinceMatch = cleanText.match(
            /(?:teaching|working|experience).*?(?:since|from)\s*(20\d{2})/i
        );

        if (sinceMatch) {
            const startYear = Number(sinceMatch[1]);
            const currentYear = new Date().getFullYear();

            if (
                startYear >= 1950 &&
                startYear <= currentYear
            ) {
                return Math.max(0, currentYear - startYear);
            }
        }

        return null;
    }

    result.experience = extractExperience();

    // =========================================
    // 5. SUBJECT CATALOGUE AND ALIASES
    // =========================================

    const subjectAliases = {
        "DBMS": [
            "database management systems",
            "database management system",
            "dbms"
        ],

        "Operating Systems": [
            "operating systems",
            "operating system"
        ],

        "Computer Networks": [
            "computer networks",
            "computer networking",
            "networking"
        ],

        "Data Structures": [
            "data structures",
            "data structure"
        ],

        "C++": [
            "c++ programming",
            "c++"
        ],

        "Java": [
            "java programming",
            "java"
        ],

        "Python": [
            "python programming",
            "python"
        ],

        "JavaScript": [
            "javascript",
            "js"
        ],

        "SQL": [
            "sql",
            "structured query language"
        ],

        "Mathematics": [
            "mathematics",
            "maths",
            "math"
        ],

        "Science": [
            "science",
            "general science"
        ],

        "English": [
            "english",
            "english language",
            "english literature"
        ],

        "Hindi": [
            "hindi"
        ],

        "Social Studies": [
            "social studies",
            "social science",
            "sst"
        ],

        "Physics": [
            "physics"
        ],

        "Chemistry": [
            "chemistry"
        ],

        "Biology": [
            "biology"
        ],

        "Economics": [
            "economics"
        ],

        "Accounts": [
            "accounts",
            "accountancy"
        ],

        "Business Studies": [
            "business studies"
        ],

        "Web Development": [
            "web development",
            "frontend development",
            "backend development",
            "full stack development"
        ],

        "Machine Learning": [
            "machine learning",
            "ml"
        ],

        "Artificial Intelligence": [
            "artificial intelligence",
            "ai"
        ],

        "Data Science": [
            "data science"
        ],

        "Computer Programming": [
            "computer programming",
            "programming"
        ]
    };

    // =========================================
    // 6. DETECT SUBJECTS
    // =========================================

    const detectedSubjects = new Set();

    for (const [subject, aliases] of Object.entries(subjectAliases)) {
        for (const alias of aliases) {
            const pattern = new RegExp(
                `(^|[^a-zA-Z0-9+#])${escapeRegex(alias)}([^a-zA-Z0-9+#]|$)`,
                "i"
            );

            if (pattern.test(cleanText)) {
                detectedSubjects.add(subject);
                break;
            }
        }
    }

    result.subjects = Array.from(detectedSubjects);

    // =========================================
    // 7. FIND EXPERTISE LEVELS
    // =========================================

    const expertiseLevels = [
        "Advanced",
        "Intermediate",
        "Beginner"
    ];

    function findExpertise(subject) {
        const aliases = subjectAliases[subject] || [subject];

        for (const alias of aliases) {
            const subjectPattern = escapeRegex(alias);

            // Look for a level before or after the subject.
            const pattern = new RegExp(
                `(?:${subjectPattern})[^\\n]{0,60}?` +
                `(Advanced|Intermediate|Beginner)`,
                "i"
            );

            const reversePattern = new RegExp(
                `(Advanced|Intermediate|Beginner)` +
                `[^\\n]{0,60}?${subjectPattern}`,
                "i"
            );

            const directMatch = cleanText.match(pattern);

            if (directMatch) {
                return normalizeLevel(directMatch[1]);
            }

            const reverseMatch = cleanText.match(reversePattern);

            if (reverseMatch) {
                return normalizeLevel(reverseMatch[1]);
            }
        }

        return null;
    }

    function normalizeLevel(level) {
        const normalized = level.toLowerCase();

        if (normalized === "advanced") {
            return "Advanced";
        }

        if (normalized === "beginner") {
            return "Beginner";
        }

        return "Intermediate";
    }

    for (const subject of result.subjects) {
        const level = findExpertise(subject);

        result.expertise[subject] =
            level || "Intermediate";
    }

    // =========================================
    // 8. EXTRACTION FROM COMMON SKILL HEADINGS
    // =========================================

    // If a resume contains skill-related headings,
    // scan the nearby lines for additional subject aliases.
    const skillHeadings = [
        "skills",
        "technical skills",
        "expertise",
        "core competencies",
        "subjects",
        "teaching subjects",
        "areas of expertise",
        "specialization"
    ];

    const skillTextParts = [];

    for (let i = 0; i < lines.length; i++) {
        const current = lines[i].toLowerCase();

        if (
            skillHeadings.some(heading =>
                current.includes(heading)
            )
        ) {
            skillTextParts.push(lines[i]);

            for (
                let j = i + 1;
                j < Math.min(i + 8, lines.length);
                j++
            ) {
                skillTextParts.push(lines[j]);
            }
        }
    }

    const skillText = skillTextParts.join("\n");

    for (const [subject, aliases] of Object.entries(subjectAliases)) {
        for (const alias of aliases) {
            const pattern = new RegExp(
                `(^|[^a-zA-Z0-9+#])${escapeRegex(alias)}([^a-zA-Z0-9+#]|$)`,
                "i"
            );

            if (pattern.test(skillText)) {
                if (!result.subjects.includes(subject)) {
                    result.subjects.push(subject);
                }

                if (!result.expertise[subject]) {
                    result.expertise[subject] =
                        findExpertise(subject) || "Intermediate";
                }

                break;
            }
        }
    }

    // =========================================
    // 9. FINAL CLEANUP
    // =========================================

    result.subjects = unique(result.subjects);

    for (const subject of result.subjects) {
        if (!result.expertise[subject]) {
            result.expertise[subject] = "Intermediate";
        }
    }

    return result;
}

module.exports = parseResume;