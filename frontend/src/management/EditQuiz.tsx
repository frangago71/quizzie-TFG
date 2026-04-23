import React, { useRef, useState, useEffect } from 'react';
import api from '../api';
import './CreateQuiz.css';
import { useNavigate, useParams } from 'react-router-dom';

interface Option { id?: number; text: string; is_correct: boolean; }
interface Question { id?: number; text: string; points: number | string; options: Option[]; }
interface QuizData { id?: number; title: string; description: string; questions: Question[]; }



const EditQuiz: React.FC = () => {
  const { id } = useParams();
  const formRef = useRef<HTMLFormElement>(null);
  const questionInputRef = useRef<HTMLInputElement>(null); 
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quiz, setQuiz] = useState<QuizData>({
    title: '',
    description: '',
    questions: [{ text: '', points: 1, options: [{ text: '', is_correct: true }, { text: '', is_correct: false }] }]
  });

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/content/quizzes/${id}`);
        setQuiz(res.data);
      } catch (err) {
        alert("Error cargando el cuestionario.");
        navigate('/quizzes');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchQuiz();
  }, [id, navigate]);

  const isCurrentQuestionBlank =
    quiz.questions[currentIndex]?.text.trim() === "" &&
    quiz.questions[currentIndex]?.options.every(opt => opt.text.trim() === "");

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
    if (currentIndex === quiz.questions.length - 1) return;
    setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const removeOption = async (qIndex: number, oIndex: number) => {
    const o = quiz.questions[qIndex].options[oIndex];
    if (o.id) {
        try {
            await api.delete(`/content/options/${o.id}`);
            const newQuestions = [...quiz.questions];
            if (newQuestions[qIndex].options.length > 2) {
              const wasCorrect = newQuestions[qIndex].options[oIndex].is_correct;
              newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
              if (wasCorrect) newQuestions[qIndex].options[0].is_correct = true;
              setQuiz({ ...quiz, questions: newQuestions });
            }
        } catch (error: any) {
            alert(error.response?.data?.detail || "Error al borrar opción");
        }
    }
  };

  const removeQuestion = async (index: number) => {
    const q = quiz.questions[index];
    if (q.id) {
        try {
            await api.delete(`/content/questions/${q.id}`);
            if (quiz.questions.length > 1) {
              const newQuestions = quiz.questions.filter((_, i) => i !== index);
              setCurrentIndex(prev => (prev >= newQuestions.length ? newQuestions.length - 1 : prev));
              setQuiz({ ...quiz, questions: newQuestions });
            }
        } catch (error: any) {
            alert(error.response?.data?.detail || "Error al borrar pregunta");
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/quizzes');
  };

  const handleDotClick = (targetIndex: number) => {
    if (targetIndex === currentIndex) return;
    setCurrentIndex(targetIndex);
  };

  if (loading) return <div style={{padding: 40}}>Cargando...</div>;
  if (!quiz || !quiz.questions || quiz.questions.length === 0) return <div style={{padding: 40}}>Error cargando preguntas.</div>;

  const isNextDisabled = isCurrentQuestionBlank || (currentIndex === quiz.questions.length - 1);

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
              readOnly
              required
            />
            <button 
              type="submit" 
              className={`btn-main ${isMobile ? 'small' : 'big'} magenta btn-header-action`}
              tabIndex={100}
            >
              <span className="text-desktop">Volver</span>
              <span className="text-mobile">Volver</span>
            </button>
          </div>
          <textarea
            className="desc-input"
            placeholder="Añade una descripción aquí..."
            tabIndex={2}
            value={quiz.description}
            readOnly
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
                readOnly
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
            readOnly
          />

          <div className="options-wrapper">
            {quiz.questions[currentIndex].options.map((o, oIndex) => (
              <div key={oIndex} className="option-item">
                <input
                  type="radio"
                  name={`correct-${currentIndex}`}
                  checked={o.is_correct}
                  tabIndex={-1}
                  readOnly
                />
                <input
                  className="input-base"
                  type="text"
                  placeholder={`Opción ${oIndex + 1}`}
                  tabIndex={5 + oIndex}
                  value={o.text}
                  readOnly
                />
                {quiz.questions[currentIndex].options.length > 2 && (
                  <button type="button" className="btn-remove" tabIndex={-1} onClick={() => removeOption(currentIndex, oIndex)}>✕</button>
                )}
              </div>
            ))}
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

export default EditQuiz;