import React, { useRef, useState, useEffect, useCallback } from "react";

import api from "../api";
import "./CreateQuiz.css";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";

interface Option {
  id: string;
  text: string;
  is_correct: boolean;
}
interface Question {
  id: string;
  text: string;
  points: number | string;
  options: Option[];
}
interface QuizData {
  title: string;
  description: string;
  questions: Question[];
}

const MAX_QUESTIONS = 30;
const MAX_OPTIONS = 8;

const generateId = () => Math.random().toString(36).substring(2, 9);

const CreateQuiz: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const questionInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quiz, setQuiz] = useState<QuizData>({
    title: "",
    description: "",
    questions: [
      {
        id: generateId(),
        text: "",
        points: 1,
        options: [
          { id: generateId(), text: "", is_correct: true },
          { id: generateId(), text: "", is_correct: false },
        ],
      },
    ],
  });

  const isCurrentQuestionBlank =
    quiz.questions[currentIndex].text.trim() === "" &&
    quiz.questions[currentIndex].options.every((opt) => opt.text.trim() === "");

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const isMobile = globalThis.innerWidth < 768;
  const minSwipeDistance = 50;

  const handleNext = useCallback(() => {
    if (isCurrentQuestionBlank) return;
    if (currentIndex === quiz.questions.length - 1) {
      if (quiz.questions.length >= MAX_QUESTIONS) return;
      const newQuestion: Question = {
        id: generateId(),
        text: "",
        points: 1,
        options: [
          { id: generateId(), text: "", is_correct: true },
          { id: generateId(), text: "", is_correct: false },
        ],
      };
      setQuiz((prev) => ({
        ...prev,
        questions: [...prev.questions, newQuestion],
      }));
    }
    setCurrentIndex((prev) => prev + 1);
  }, [isCurrentQuestionBlank, currentIndex, quiz.questions.length]);

  const handlePrev = useCallback(() => {
    const currentQ = quiz.questions[currentIndex];
    if (currentQ.text.trim() === "" && quiz.questions.length > 1) {
      const newQs = quiz.questions.filter((_, i) => i !== currentIndex);
      setQuiz((prev) => ({ ...prev, questions: newQs }));
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    } else {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    }
  }, [currentIndex, quiz.questions]);

  useEffect(() => {
    questionInputRef.current?.focus();
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleNext();
    else if (distance < -minSwipeDistance) handlePrev();
  };

  const addOption = (qIndex: number) => {
    if (quiz.questions[qIndex].options.length >= MAX_OPTIONS) return;
    const newQuestions = [...quiz.questions];
    newQuestions[qIndex].options.push({
      id: generateId(),
      text: "",
      is_correct: false,
    });
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...quiz.questions];
    if (newQuestions[qIndex].options.length > 2) {
      const wasCorrect = newQuestions[qIndex].options[oIndex].is_correct;
      newQuestions[qIndex].options = newQuestions[qIndex].options.filter(
        (_, i) => i !== oIndex,
      );
      if (wasCorrect) newQuestions[qIndex].options[0].is_correct = true;
      setQuiz({ ...quiz, questions: newQuestions });
    }
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...quiz.questions];
    newQuestions[qIndex].options = newQuestions[qIndex].options.map(
      (opt, i) => ({
        ...opt,
        is_correct: i === oIndex,
      }),
    );
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    if (valStr === "") {
      const newQs = [...quiz.questions];
      newQs[currentIndex].points = "";
      setQuiz({ ...quiz, questions: newQs });
      return;
    }
    const val = Number.parseInt(valStr, 10);
    if (Number.isNaN(val)) return;
    const finalVal = Math.min(val, 100);
    const newQs = [...quiz.questions];
    newQs[currentIndex].points = finalVal;
    setQuiz({ ...quiz, questions: newQs });
  };

  const handlePointsBlur = () => {
    const currentPoints = Number(quiz.questions[currentIndex].points);
    if (Number.isNaN(currentPoints) || currentPoints < 1) {
      const newQs = [...quiz.questions];
      newQs[currentIndex].points = 1;
      setQuiz({ ...quiz, questions: newQs });
    }
  };

  const removeQuestion = (index: number) => {
    if (quiz.questions.length > 1) {
      const newQuestions = quiz.questions.filter((_, i) => i !== index);
      setCurrentIndex((prev) =>
        prev >= newQuestions.length ? newQuestions.length - 1 : prev,
      );
      setQuiz({ ...quiz, questions: newQuestions });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz.title.trim() || !quiz.description.trim()) {
      toast.warning("Título y descripción son obligatorios.");
      return;
    }
    for (let qi = 0; qi < quiz.questions.length; qi++) {
      const q = quiz.questions[qi];
      if (!q.text.trim()) {
        toast.warning(`La pregunta ${qi + 1} no tiene enunciado.`);
        setCurrentIndex(qi);
        return;
      }
      for (let oi = 0; oi < q.options.length; oi++) {
        if (!q.options[oi].text.trim()) {
          toast.warning(
            `La opción ${oi + 1} de la pregunta ${qi + 1} está en blanco.`,
          );
          setCurrentIndex(qi);
          return;
        }
      }
    }
    try {
      const payload = {
        ...quiz,
        questions: quiz.questions.map((q) => {
          const { id: _qId, ...qRest } = q;
          return {
            ...qRest,
            options: q.options.map((o) => {
              const { id: _oId, ...oRest } = o;
              return oRest;
            }),
          };
        }),
      };
      await api.post("/content/quizzes", payload);
      toast.success("¡Cuestionario creado con éxito!");
      navigate("/quizzes");
    } catch {
      toast.error("Error al conectar con el servidor.");
    }
  };

  const handleDotClick = (targetIndex: number) => {
    if (targetIndex === currentIndex) return;
    const currentQ = quiz.questions[currentIndex];
    const isQuestionEmpty =
      currentQ.text.trim() === "" &&
      currentQ.options.every((o) => o.text.trim() === "");
    if (isQuestionEmpty && quiz.questions.length > 1) {
      removeQuestion(currentIndex);
      setCurrentIndex(
        targetIndex > currentIndex ? targetIndex - 1 : targetIndex,
      );
    } else {
      setCurrentIndex(targetIndex);
    }
  };

  const isNextDisabled =
    isCurrentQuestionBlank ||
    (currentIndex === quiz.questions.length - 1 &&
      quiz.questions.length >= MAX_QUESTIONS);
  const currentOptionsCount = quiz.questions[currentIndex].options.length;
  const canAddMoreOptions =
    currentOptionsCount < MAX_OPTIONS &&
    quiz.questions[currentIndex].options.every((opt) => opt.text.trim() !== "");

  return (
    <form
      ref={formRef}
      className="create-quiz-container"
      onSubmit={handleSubmit}
    >
      <header className="fixed-header-section">
        <div className="header-text-group">
          <div className="title-row">
            <input
              className="title-input"
              type="text"
              placeholder="Título"
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              required
            />
            <button
              type="submit"
              className={`btn-main ${isMobile ? "small" : "big"} magenta btn-header-action`}
            >
              <span className="text-desktop">Crear cuestionario</span>
              <span className="text-mobile">Crear</span>
            </button>
          </div>
          <textarea
            className="desc-input"
            placeholder="Añade una descripción aquí..."
            value={quiz.description}
            onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
            required
          />
        </div>
      </header>

      <div className="nav-dots pc-dots">
        {quiz.questions.map((q, i) => (
          <button
            key={q.id || `dot-${i}`}
            type="button"
            className={`dot ${i === currentIndex ? "active" : ""}`}
            onClick={() => handleDotClick(i)}
            aria-label={`Ir a la pregunta ${i + 1}`}
          />
        ))}
      </div>

      <div className="quiz-top-nav-mobile">
        <div className="nav-dots">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id || `mob-dot-${i}`}
              type="button"
              className={`dot ${i === currentIndex ? "active" : ""}`}
              onClick={() => handleDotClick(i)}
              aria-label={`Ir a la pregunta ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="quiz-main-layout">
        <button
          type="button"
          className="quiz-slider-btn btn-pc-nav"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          ‹
        </button>

        <div
          className="question-card"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {quiz.questions.length > 1 && (
            <button
              type="button"
              className="btn-remove-question-fixed"
              onClick={() => removeQuestion(currentIndex)}
              tabIndex={-1}
            >
              ✕
            </button>
          )}

          <div className="question-card-header">
            <span className="question-number">
              PREGUNTA {currentIndex + 1} de {quiz.questions.length}
            </span>
            <div className="question-meta">
              <label htmlFor={`points-${currentIndex}`}>PUNTOS</label>
              <input
                id={`points-${currentIndex}`}
                type="number"
                className="input-base points-input"
                min="1"
                max="100"
                value={quiz.questions[currentIndex].points || ""}
                onChange={handlePointsChange}
                onBlur={handlePointsBlur}
              />
            </div>
          </div>

          <input
            ref={questionInputRef}
            className="input-base question-text-input"
            type="text"
            placeholder="Escribe el enunciado"
            value={quiz.questions[currentIndex].text}
            onChange={(e) => {
              const newQs = [...quiz.questions];
              newQs[currentIndex].text = e.target.value;
              setQuiz({ ...quiz, questions: newQs });
            }}
          />

          <div className="options-wrapper">
            {quiz.questions[currentIndex].options.map((o, oIndex) => (
              <div key={o.id || `opt-${oIndex}`} className="option-item">
                <input
                  type="radio"
                  name={`correct-${currentIndex}`}
                  checked={o.is_correct}
                  tabIndex={-1}
                  onChange={() => setCorrectOption(currentIndex, oIndex)}
                  aria-label="Opción correcta"
                />
                <input
                  className="input-base"
                  type="text"
                  placeholder={`Opción ${oIndex + 1}`}
                  value={o.text}
                  onChange={(e) => {
                    const newQs = [...quiz.questions];
                    newQs[currentIndex].options[oIndex].text = e.target.value;
                    setQuiz({ ...quiz, questions: newQs });
                  }}
                />
                {quiz.questions[currentIndex].options.length > 2 && (
                  <button
                    type="button"
                    className="btn-remove"
                    tabIndex={-1}
                    onClick={() => removeOption(currentIndex, oIndex)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className={`btn-add-ghost ${canAddMoreOptions ? "" : "disabled"}`}
              onClick={() => canAddMoreOptions && addOption(currentIndex)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOption(currentIndex);
                }
                if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  questionInputRef.current?.focus();
                }
              }}
              disabled={!canAddMoreOptions}
              aria-label="Añadir opción"
            >
              <input
                className="input-base"
                type="text"
                placeholder={
                  currentOptionsCount >= MAX_OPTIONS
                    ? "Límite alcanzado"
                    : "Añadir opción..."
                }
                readOnly
                tabIndex={-1}
              />
            </button>
          </div>
        </div>

        <div className="mobile-card-nav">
          <button
            type="button"
            className="nav-arrow-bottom"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            ‹
          </button>
          <button
            type="button"
            className="nav-arrow-bottom"
            onClick={handleNext}
            disabled={isNextDisabled}
          >
            ›
          </button>
        </div>

        <button
          type="button"
          className="quiz-slider-btn btn-pc-nav"
          onClick={handleNext}
          disabled={isNextDisabled}
        >
          ›
        </button>
      </div>
    </form>
  );
};

export default CreateQuiz;
