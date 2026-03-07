import React, { useState } from 'react';
import axios from 'axios';
import './CreateQuiz.css';

interface Answer { text: string; is_correct: boolean; }
interface Question { text: string; points: number | string; answers: Answer[]; }
interface QuizData { title: string; description: string; questions: Question[]; }

const CreateQuiz: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quiz, setQuiz] = useState<QuizData>({
    title: '',
    description: '',
    questions: [{ text: '', points: 1, answers: [{ text: '', is_correct: true }, { text: '', is_correct: false }] }]
  });

  const isCurrentQuestionBlank =
    quiz.questions[currentIndex].text.trim() === "" &&
    quiz.questions[currentIndex].answers.every(ans => ans.text.trim() === "");

  const handleNext = () => {
    if (isCurrentQuestionBlank) return;
    if (currentIndex === quiz.questions.length - 1) {
      const newQuestion: Question = {
        text: '', points: 1,
        answers: [{ text: '', is_correct: true }, { text: '', is_correct: false }]
      };
      setQuiz({ ...quiz, questions: [...quiz.questions, newQuestion] });
    }
    setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    const currentQ = quiz.questions[currentIndex];
    if (currentQ.text.trim() === "" && quiz.questions.length > 1) {
      const newQs = quiz.questions.filter((_, i) => i !== currentIndex);
      setQuiz({ ...quiz, questions: newQs });
      setCurrentIndex(Math.max(0, currentIndex - 1));
    } else {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const addAnswer = (qIndex: number) => {
    const newQuestions = [...quiz.questions];
    newQuestions[qIndex].answers.push({ text: '', is_correct: false });
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const removeAnswer = (qIndex: number, aIndex: number) => {
    const newQuestions = [...quiz.questions];
    if (newQuestions[qIndex].answers.length > 2) {
      const wasCorrect = newQuestions[qIndex].answers[aIndex].is_correct;
      newQuestions[qIndex].answers = newQuestions[qIndex].answers.filter((_, i) => i !== aIndex);
      if (wasCorrect) newQuestions[qIndex].answers[0].is_correct = true;
      setQuiz({ ...quiz, questions: newQuestions });
    }
  };

  const setCorrectAnswer = (qIndex: number, aIndex: number) => {
    const newQuestions = [...quiz.questions];
    newQuestions[qIndex].answers = newQuestions[qIndex].answers.map((ans, i) => ({
      ...ans, is_correct: i === aIndex
    }));
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz.title.trim()) {
      alert("Error: El cuestionario debe tener un título.");
      return;
    }
    if (!quiz.description.trim()) {
      alert("Error: El cuestionario debe tener una descripción.");
      return;
    }
    if (quiz.questions.length === 0) {
      alert("Error: El cuestionario debe tener al menos una pregunta.");
      return;
    }
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      const questionNum = i + 1;
      if (!q.text.trim()) {
        alert(`Error en la pregunta ${questionNum}: El enunciado está incompleto.`);
        setCurrentIndex(i);
        return;
      }
      if (q.answers.length < 2) {
        alert(`Error en la pregunta ${questionNum}: Debe tener al menos 2 opciones.`);
        setCurrentIndex(i);
        return;
      }
      if (!q.answers.some(a => a.is_correct)) {
        alert(`Error en la pregunta ${questionNum}: Debes marcar una opción como correcta.`);
        setCurrentIndex(i);
        return;
      }
      for (let j = 0; j < q.answers.length; j++) {
        if (!q.answers[j].text.trim()) {
          alert(`Error en la pregunta ${questionNum}: La respuesta número ${j + 1} está incompleta.`);
          setCurrentIndex(i);
          return;
        }
      }
    }
    try {
      await axios.post('http://localhost:8000/content/quizzes', quiz);
      alert("¡Cuestionario creado con éxito! ");
      window.location.reload();
    } catch (err) {
      alert("Error al conectar con el servidor.");
      console.error(err);
    }
  };

  const handleDotClick = (targetIndex: number) => {
    if (targetIndex === currentIndex) return;

    const currentQ = quiz.questions[currentIndex];
    const isQuestionEmpty =
      currentQ.text.trim() === "" &&
      currentQ.answers.every(a => a.text.trim() === "");

    if (isQuestionEmpty && quiz.questions.length > 1) {
      removeQuestion(currentIndex);
      setCurrentIndex(targetIndex > currentIndex ? targetIndex - 1 : targetIndex);
    } else {
      setCurrentIndex(targetIndex);
    }
  };

  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;

    if (valStr === '') {
      const newQs = [...quiz.questions];
      newQs[currentIndex].points = '';
      setQuiz({ ...quiz, questions: newQs });
      return;
    }

    const val = parseInt(valStr, 10);
    if (isNaN(val)) return;

    const finalVal = val > 100 ? 100 : val;
    const newQs = [...quiz.questions];
    newQs[currentIndex].points = finalVal;
    setQuiz({ ...quiz, questions: newQs });
  };

  const handlePointsBlur = () => {
    const currentPoints = Number(quiz.questions[currentIndex].points);
    if (isNaN(currentPoints) || currentPoints < 1) {
      const newQs = [...quiz.questions];
      newQs[currentIndex].points = 1;
      setQuiz({ ...quiz, questions: newQs });
    }
  };

  const removeQuestion = (index: number) => {
    if (quiz.questions.length > 1) {
      const newQuestions = quiz.questions.filter((_, i) => i !== index);
      if (currentIndex >= newQuestions.length) {
        setCurrentIndex(newQuestions.length - 1);
      }

      setQuiz({ ...quiz, questions: newQuestions });
    }
  };

  const canAddMore = quiz.questions[currentIndex].answers.every(ans => ans.text.trim() !== "");

  return (
    <div className="create-quiz-container">
      <header className="fixed-header-section">
        <div className="header-text-group">
          <div className="title-row">
            <input
              className="title-input"
              type="text"
              placeholder="Título"
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
            />
            <button type="button" className="btn-main-magenta btn-header-action" onClick={handleSubmit}>
              <span className="text-desktop">Crear cuestionario</span>
              <span className="text-mobile">Crear</span>
            </button>
          </div>
          <textarea
            className="desc-input"
            placeholder="Añade una descripción aquí..."
            value={quiz.description}
            onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
          />
        </div>
      </header>

      <div className="nav-dots pc-dots">
        {quiz.questions.map((_, i) => (
          <div key={i} className={`dot ${i === currentIndex ? 'active' : ''}`} onClick={() => handleDotClick(i)} />
        ))}
      </div>

      <div className="quiz-top-nav-mobile">
        <div className="nav-dots">
          {quiz.questions.map((_, i) => (
            <div key={i} className={`dot ${i === currentIndex ? 'active' : ''}`} onClick={() => handleDotClick(i)} />
          ))}
        </div>
      </div>

      <div className="quiz-main-layout">
        <button type="button" className="quiz-slider-btn btn-pc-nav" onClick={handlePrev} disabled={currentIndex === 0}>‹</button>

        <div className="question-card">
          {quiz.questions.length > 1 && (
            <button type="button" className="btn-remove-question-fixed" onClick={() => removeQuestion(currentIndex)}>✕</button>
          )}

          <div className="question-card-header">
            <span className="question-number">PREGUNTA {currentIndex + 1}</span>
            <div className="question-meta">
              <label>PUNTOS</label>
              <input
                type="number"
                className="input-base points-input"
                min="1"
                max="100"
                value={quiz.questions[currentIndex].points || ''}
                onChange={handlePointsChange}
                onBlur={handlePointsBlur}
              />
            </div>
          </div>

          <input
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
          <div className="answers-wrapper">
            {quiz.questions[currentIndex].answers.map((a, aIndex) => (
              <div key={aIndex} className="answer-item">
                <input
                  type="radio"
                  name={`correct-${currentIndex}`}
                  checked={a.is_correct}
                  onChange={() => setCorrectAnswer(currentIndex, aIndex)}
                />
                <input
                  className="input-base"
                  type="text"
                  placeholder={`Opción ${aIndex + 1}`}
                  value={a.text}
                  onChange={(e) => {
                    const newQs = [...quiz.questions];
                    newQs[currentIndex].answers[aIndex].text = e.target.value;
                    setQuiz({ ...quiz, questions: newQs });
                  }}
                />
                {quiz.questions[currentIndex].answers.length > 2 && (
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeAnswer(currentIndex, aIndex)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <div className={`btn-add-ghost ${!canAddMore ? 'disabled' : ''}`} onClick={() => canAddMore && addAnswer(currentIndex)}>
              <input className="input-base" type="text" placeholder="Añadir opción..." readOnly />
            </div>
          </div>
        </div>

        <div className="mobile-card-nav">
          <button type="button" className="nav-arrow-bottom" onClick={handlePrev} disabled={currentIndex === 0}>‹</button>
          <button type="button" className="nav-arrow-bottom" onClick={handleNext} disabled={isCurrentQuestionBlank}>›</button>
        </div>

        <button type="button" className="quiz-slider-btn btn-pc-nav" onClick={handleNext} disabled={isCurrentQuestionBlank}>›</button>
      </div>
    </div>
  );
};

export default CreateQuiz;