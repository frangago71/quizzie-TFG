import React, { useRef, useState, useEffect } from 'react';
import api from '../api';
import './CreateQuiz.css';
import { useNavigate } from 'react-router-dom';

interface Option { text: string; is_correct: boolean; }
interface Question { text: string; points: number | string; options: Option[]; }
interface QuizData { title: string; description: string; questions: Question[]; }

const MAX_QUESTIONS = 30;
const MAX_OPTIONS = 8;

const CreateQuiz: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const questionInputRef = useRef<HTMLInputElement>(null); 
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quiz, setQuiz] = useState<QuizData>({
    title: '',
    description: '',
    questions: [{ text: '', points: 1, options: [{ text: '', is_correct: true }, { text: '', is_correct: false }] }]
  });

  const isCurrentQuestionBlank =
    quiz.questions[currentIndex].text.trim() === "" &&
    quiz.questions[currentIndex].options.every(opt => opt.text.trim() === "");

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const isMobile = window.innerWidth < 768;
  const minSwipeDistance = 50;

  useEffect(() => {
    questionInputRef.current?.focus();
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, quiz.questions.length, isCurrentQuestionBlank]);


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

  const handleNext = () => {
    if (isCurrentQuestionBlank) return;
    if (currentIndex === quiz.questions.length - 1) {
      if (quiz.questions.length >= MAX_QUESTIONS) return;
      const newQuestion: Question = {
        text: '', points: 1,
        options: [{ text: '', is_correct: true }, { text: '', is_correct: false }]
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

  const addOption = (qIndex: number) => {
    if (quiz.questions[qIndex].options.length >= MAX_OPTIONS) return;
    const newQuestions = [...quiz.questions];
    newQuestions[qIndex].options.push({ text: '', is_correct: false });
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...quiz.questions];
    if (newQuestions[qIndex].options.length > 2) {
      const wasCorrect = newQuestions[qIndex].options[oIndex].is_correct;
      newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
      if (wasCorrect) newQuestions[qIndex].options[0].is_correct = true;
      setQuiz({ ...quiz, questions: newQuestions });
    }
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...quiz.questions];
    newQuestions[qIndex].options = newQuestions[qIndex].options.map((opt, i) => ({
      ...opt, is_correct: i === oIndex
    }));
    setQuiz({ ...quiz, questions: newQuestions });
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
      setCurrentIndex(prev => (prev >= newQuestions.length ? newQuestions.length - 1 : prev));
      setQuiz({ ...quiz, questions: newQuestions });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz.title.trim() || !quiz.description.trim()) {
        alert("Título y descripción son obligatorios.");
        return;
    }
    try {
      await api.post('/content/quizzes', quiz);
      alert("¡Cuestionario creado con éxito!");
      navigate('/quizzes');
    } catch (err) {
      alert("Error al conectar con el servidor.");
    }
  };

  const handleDotClick = (targetIndex: number) => {
    if (targetIndex === currentIndex) return;
    const currentQ = quiz.questions[currentIndex];
    const isQuestionEmpty = currentQ.text.trim() === "" && currentQ.options.every(o => o.text.trim() === "");
    if (isQuestionEmpty && quiz.questions.length > 1) {
      removeQuestion(currentIndex);
      setCurrentIndex(targetIndex > currentIndex ? targetIndex - 1 : targetIndex);
    } else {
      setCurrentIndex(targetIndex);
    }
  };

  const isNextDisabled = isCurrentQuestionBlank || (currentIndex === quiz.questions.length - 1 && quiz.questions.length >= MAX_QUESTIONS);
  const currentOptionsCount = quiz.questions[currentIndex].options.length;
  const canAddMoreOptions = currentOptionsCount < MAX_OPTIONS && quiz.questions[currentIndex].options.every(opt => opt.text.trim() !== "");

  return (
    <form ref={formRef} className="create-quiz-container" onSubmit={handleSubmit}>
      <header className="fixed-header-section">
        <div className="header-text-group">
          <div className="title-row">
            <input
              className="title-input"
              type="text"
              placeholder="Título"
              tabIndex={1}
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              required
            />
            <button 
              type="submit" 
              className={`btn-main ${isMobile ? 'small' : 'big'} magenta btn-header-action`}
              tabIndex={100}
            >
              <span className="text-desktop">Crear cuestionario</span>
              <span className="text-mobile">Crear</span>
            </button>
          </div>
          <textarea
            className="desc-input"
            placeholder="Añade una descripción aquí..."
            tabIndex={2}
            value={quiz.description}
            onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
            required
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

        <div className="question-card" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          {quiz.questions.length > 1 && (
            <button type="button" className="btn-remove-question-fixed" onClick={() => removeQuestion(currentIndex)} tabIndex={-1}>✕</button>
          )}

          <div className="question-card-header">
            <span className="question-number">PREGUNTA {currentIndex + 1} de {quiz.questions.length}</span>
            <div className="question-meta">
              <label>PUNTOS</label>
              <input
                type="number"
                className="input-base points-input"
                min="1" max="100"
                tabIndex={3}
                value={quiz.questions[currentIndex].points || ''}
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
            tabIndex={4}
            value={quiz.questions[currentIndex].text}
            onChange={(e) => {
              const newQs = [...quiz.questions];
              newQs[currentIndex].text = e.target.value;
              setQuiz({ ...quiz, questions: newQs });
            }}
          />

          <div className="options-wrapper">
            {quiz.questions[currentIndex].options.map((o, oIndex) => (
              <div key={oIndex} className="option-item">
                <input
                  type="radio"
                  name={`correct-${currentIndex}`}
                  checked={o.is_correct}
                  tabIndex={-1}
                  onChange={() => setCorrectOption(currentIndex, oIndex)}
                />
                <input
                  className="input-base"
                  type="text"
                  placeholder={`Opción ${oIndex + 1}`}
                  tabIndex={5 + oIndex}
                  value={o.text}
                  onChange={(e) => {
                    const newQs = [...quiz.questions];
                    newQs[currentIndex].options[oIndex].text = e.target.value;
                    setQuiz({ ...quiz, questions: newQs });
                  }}
                />
                {quiz.questions[currentIndex].options.length > 2 && (
                  <button type="button" className="btn-remove" tabIndex={-1} onClick={() => removeOption(currentIndex, oIndex)}>✕</button>
                )}
              </div>
            ))}
            
            <div 
              className={`btn-add-ghost ${!canAddMoreOptions ? 'disabled' : ''}`} 
              onClick={() => canAddMoreOptions && addOption(currentIndex)}
              tabIndex={5 + currentOptionsCount}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addOption(currentIndex); }
                if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); questionInputRef.current?.focus(); }
              }}
            >
              <input className="input-base" type="text" placeholder={currentOptionsCount >= MAX_OPTIONS ? "Límite alcanzado" : "Añadir opción..."} readOnly tabIndex={-1} />
            </div>
          </div>
        </div>

        <div className="mobile-card-nav">
          <button type="button" className="nav-arrow-bottom" onClick={handlePrev} disabled={currentIndex === 0}>‹</button>
          <button type="button" className="nav-arrow-bottom" onClick={handleNext} disabled={isNextDisabled}>›</button>
        </div>

        <button type="button" className="quiz-slider-btn btn-pc-nav" onClick={handleNext} disabled={isNextDisabled}>›</button>
      </div>
    </form>
  );
};

export default CreateQuiz;