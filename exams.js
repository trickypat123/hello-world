/*
 * Built-in exam library.
 *
 * These two are ORIGINAL sample papers (written for this tool) so you can try every
 * feature. To practise a real past paper, add it via  Manage -> Import exam  using the
 * JSON format documented in README.md (see also exams/template.json).
 * Maths: use $inline$ or $$display$$ LaTeX.
 */
window.EXAMS = [
  {
    id: "sample-specialist-tf",
    title: "Specialist Mathematics Exam 1 (Tech-Free) — Sample",
    subject: "Specialist Mathematics",
    year: 2022,
    type: "Tech-Free",
    source: "Original sample paper",
    readingMin: 15,
    writingMin: 30,
    instructions: "Short-answer paper. No calculators. Show your working; marks are given for method.",
    questions: [
      {
        number: 1, topic: "Complex numbers",
        text: "Let $z = 1 + i\\sqrt{3}$.",
        parts: [
          { label: "a", marks: 2, text: "Write $z$ in the form $r\\,\\mathrm{cis}(\\theta)$, where $\\theta \\in (-\\pi, \\pi]$.",
            answer: "2cis(pi/3)", accept: ["2cis(pi/3)", "2cis(π/3)", "2(cos(pi/3)+isin(pi/3))"],
            solution: "$|z| = \\sqrt{1+3} = 2$ and $\\mathrm{Arg}(z) = \\tan^{-1}(\\sqrt3) = \\frac{\\pi}{3}$.\n\nSo $z = 2\\,\\mathrm{cis}\\left(\\frac{\\pi}{3}\\right)$." },
          { label: "b", marks: 1, text: "Hence find $z^6$.",
            answer: "64", accept: ["64"],
            solution: "By de Moivre: $z^6 = 2^6\\,\\mathrm{cis}(2\\pi) = 64$." }
        ]
      },
      {
        number: 2, topic: "Calculus",
        parts: [
          { label: "a", marks: 2, text: "Evaluate $\\displaystyle\\int_0^{\\pi/4} \\sec^2(x)\\tan^3(x)\\,dx$.",
            answer: "1/4", accept: ["1/4", "0.25", "\\frac{1}{4}"],
            solution: "Let $u=\\tan x$, so $du = \\sec^2 x\\,dx$. Limits: $0 \\to 1$.\n\n$$\\int_0^1 u^3\\,du = \\left[\\frac{u^4}{4}\\right]_0^1 = \\frac14$$" },
          { label: "b", marks: 2, text: "Find $\\dfrac{dy}{dx}$ if $y = \\sin^{-1}(x^2)$.",
            answer: "2x/sqrt(1-x^4)", accept: ["2x/sqrt(1-x^4)", "2x/√(1-x^4)", "\\frac{2x}{\\sqrt{1-x^4}}"],
            solution: "Chain rule: $\\dfrac{dy}{dx} = \\dfrac{1}{\\sqrt{1-(x^2)^2}}\\cdot 2x = \\dfrac{2x}{\\sqrt{1-x^4}}$." }
        ]
      },
      {
        number: 3, topic: "Vectors",
        text: "Let $\\mathbf{a} = \\mathbf{i} + 2\\mathbf{j} - \\mathbf{k}$ and $\\mathbf{b} = 2\\mathbf{i} - \\mathbf{j} + \\mathbf{k}$.",
        parts: [
          { label: "a", marks: 1, text: "Find $\\mathbf{a}\\cdot\\mathbf{b}$.",
            answer: "-1", accept: ["-1"],
            solution: "$\\mathbf a\\cdot\\mathbf b = (1)(2)+(2)(-1)+(-1)(1) = 2-2-1 = -1$." },
          { label: "b", marks: 2, text: "Find $\\mathbf{a}\\times\\mathbf{b}$.",
            answer: "i-3j-5k", accept: ["i-3j-5k", "(1,-3,-5)", "<1,-3,-5>"],
            solution: "$$\\mathbf a\\times\\mathbf b = \\begin{vmatrix}\\mathbf i&\\mathbf j&\\mathbf k\\\\1&2&-1\\\\2&-1&1\\end{vmatrix} = (2-1)\\mathbf i-(1+2)\\mathbf j+(-1-4)\\mathbf k = \\mathbf i-3\\mathbf j-5\\mathbf k$$" }
        ]
      },
      {
        number: 4, topic: "Differential equations", marks: 3,
        text: "Solve the differential equation $\\dfrac{dy}{dx} = 2xy$ given that $y(0) = 3$. Give $y$ as a function of $x$.",
        answer: "y=3e^(x^2)", accept: ["y=3e^(x^2)", "3e^(x^2)", "y=3e^{x^2}", "3e^{x^2}"],
        solution: "Separate: $\\int \\dfrac{1}{y}\\,dy = \\int 2x\\,dx \\Rightarrow \\ln|y| = x^2 + c$.\n\nSo $y = Ae^{x^2}$. Using $y(0)=3$: $A = 3$.\n\n$$y = 3e^{x^2}$$"
      },
      {
        number: 5, topic: "Mechanics",
        text: "A particle of mass $2$ kg moves so that its velocity at time $t$ seconds is $\\mathbf{v}(t) = 3t\\,\\mathbf{i} + 4\\,\\mathbf{j}$ m/s.",
        parts: [
          { label: "a", marks: 1, text: "Find the acceleration of the particle.",
            answer: "3i", accept: ["3i", "(3,0)"],
            solution: "$\\mathbf a = \\dfrac{d\\mathbf v}{dt} = 3\\mathbf i$ m/s²." },
          { label: "b", marks: 2, text: "Find the magnitude of the net force acting on the particle.",
            answer: "6", accept: ["6", "6N"],
            solution: "$\\mathbf F = m\\mathbf a = 2(3\\mathbf i) = 6\\mathbf i$, so $|\\mathbf F| = 6$ N." }
        ]
      },
      {
        number: 6, topic: "Complex numbers", marks: 3,
        text: "Solve $z^2 + 2z + 5 = 0$ for $z \\in \\mathbb{C}$.",
        answer: "z=-1±2i", accept: ["-1±2i", "z=-1±2i", "-1+2i,-1-2i", "z=-1+2i,z=-1-2i"],
        solution: "$$z = \\frac{-2\\pm\\sqrt{4-20}}{2} = \\frac{-2\\pm 4i}{2} = -1\\pm 2i$$"
      }
    ]
  },
  {
    id: "sample-specialist-mcq",
    title: "Specialist Mathematics Exam 2, Section A (Multiple Choice) — Sample",
    subject: "Specialist Mathematics",
    year: 2022,
    type: "Multiple Choice",
    source: "Original sample paper",
    readingMin: 0,
    writingMin: 10,
    instructions: "Choose the response that is correct or that best answers the question.",
    questions: [
      { number: 1, topic: "Complex numbers", text: "The modulus of $3 - 4i$ is", options: ["$1$", "$5$", "$7$", "$25$"], answer: 1,
        solution: "$|3-4i| = \\sqrt{3^2+(-4)^2} = \\sqrt{25} = 5$." },
      { number: 2, topic: "Calculus", text: "An antiderivative of $\\dfrac{1}{x^2+1}$ is", options: ["$\\ln(x^2+1)$", "$\\tan^{-1}(x)$", "$-\\dfrac{1}{(x^2+1)^2}$", "$\\sin^{-1}(x)$"], answer: 1,
        solution: "$\\dfrac{d}{dx}\\tan^{-1}x = \\dfrac{1}{1+x^2}$." },
      { number: 3, topic: "Vectors", text: "The scalar resolute of $\\mathbf a = 3\\mathbf i + 4\\mathbf j$ in the direction of $\\mathbf b = \\mathbf i$ is", options: ["$3$", "$4$", "$5$", "$3\\mathbf i$"], answer: 0,
        solution: "$\\mathbf a\\cdot\\hat{\\mathbf b} = 3$. (The vector resolute would be $3\\mathbf i$.)" },
      { number: 4, topic: "Functions", text: "The maximal domain of $f(x) = \\cos^{-1}(2x)$ is", options: ["$[-1, 1]$", "$\\left[-\\tfrac12, \\tfrac12\\right]$", "$[-2, 2]$", "$[0, \\pi]$"], answer: 1,
        solution: "Need $-1 \\le 2x \\le 1$, so $-\\tfrac12 \\le x \\le \\tfrac12$." },
      { number: 5, topic: "Differential equations", text: "Euler's method with step size $h = 0.1$ is applied to $\\dfrac{dy}{dx} = x + y$, $y(0) = 1$. The value of $y_1$ is", options: ["$1.0$", "$1.1$", "$1.2$", "$1.11$"], answer: 1,
        solution: "$y_1 = y_0 + h\\,f(x_0,y_0) = 1 + 0.1(0+1) = 1.1$." },
      { number: 6, topic: "Complex numbers", text: "The sum of the three cube roots of $1$ is", options: ["$-1$", "$0$", "$1$", "$3$"], answer: 1,
        solution: "The roots of $z^3-1=0$ sum to $-\\dfrac{\\text{coefficient of }z^2}{\\text{coefficient of }z^3} = 0$." }
    ]
  }
];
