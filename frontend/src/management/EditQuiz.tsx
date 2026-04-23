import React, { useRef, useState, useEffect } from 'react';
import api from '../api';
import './CreateQuiz.css';
import '../auth/Modal.css';
import { useNavigate, useParams } from 'react-router-dom';

interface Option { id?: number; text: string; is_correct: boolean; _deleted?: boolean; }
interface Question { id?: number; text: string; points: number | string; options: Option[]; _deleted?: boolean; }
interface QuizData { id?: number; title: string; description: string; questions: Question[]; }

const EditQuiz: React.FC = () => {
  const { id } = useParams();
  const formRef = useRef<HTMLFormElement>(null);
  const questionInputRef = useRef<HTMLInputElement>(null); 
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const currentQ = quiz.questions[currentIndex];
  const isCurrentQuestionBlank = currentQ && currentQ.text.trim() === "" && currentQ.options.every(opt => opt.text.trim() === "");

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const isMobile = window.innerWidth < 768;
  const minSwipeDistance = 50;

  useEffect(() => {
    questionInputRef.current?.focus();
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, quiz.questions?.length, isCurrentQuestionBlank, isModalOpen]);

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

  const toggleOptionDeleted = (qIndex: number, oIndex: number) => {
    const newQuestions = [...quiz.questions];
    const isDeleted = newQuestions[qIndex].options[oIndex]._deleted;
    
    if (!isDeleted) {
        const activeOptions = newQuestions[qIndex].options.filter(o => !o._deleted);
        if (activeOptions.length <= 2) {
            alert("No puedes borrar esta opción. Cada pregunta debe tener al menos dos opciones.");
            return;
        }
        if (newQuestions[qIndex].options[oIndex].is_correct) {
             alert("No puedes borrar la opción correcta. Selecciona otra como correcta primero.");
             return;
        }
    }
    
    newQuestions[qIndex].options[oIndex]._deleted = !isDeleted;
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const toggleQuestionDeleted = (index: number) => {
    const newQuestions = [...quiz.questions];
    const isDeleted = newQuestions[index]._deleted;
    if (!isDeleted) {
        const activeQuestions = newQuestions.filter(q => !q._deleted);
        if (activeQuestions.length <= 1) {
            alert("No puedes borrar la última pregunta. El cuestionario debe tener al menos una.");
            return;
        }
    }
    newQuestions[index]._deleted = !isDeleted;
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const confirmSubmit = async () => {
    try {
        const payload = {
            title: quiz.title,
            description: quiz.description,
            questions: quiz.questions.filter(q => !q._deleted).map(q => ({
                id: q.id,
                text: q.text,
                points: Number(q.points),
                options: q.options.filter(o => !o._deleted).map(o => ({
                    id: o.id,
                    text: o.text,
                    is_correct: o.is_correct
                }))
            }))
        };
        await api.put(`/content/quizzes/${id}`, payload);
        setIsModalOpen(false);
        navigate('/quizzes');
    } catch (error: any) {
        alert(error.response?.data?.detail || "Error al actualizar cuestionario");
        setIsModalOpen(false);
    }
  };

  const handleDotClick = (targetIndex: number) => {
    if (targetIndex === currentIndex) return;
    setCurrentIndex(targetIndex);
  };

  const handleQuizChange = (field: keyof QuizData, value: string) => {
    setQuiz({ ...quiz, [field]: value });
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: string | number) => {
    const newQuestions = [...quiz.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const handleOptionChange = (qIndex: number, oIndex: number, text: string) => {
    const newQuestions = [...quiz.questions];
    newQuestions[qIndex].options[oIndex].text = text;
    setQuiz({ ...quiz, questions: newQuestions });
  };

  const handleCorrectOptionChange = (qIndex: number, oIndex: number) => {
    const newQuestions = [...quiz.questions];
    newQuestions[qIndex].options = newQuestions[qIndex].options.map((opt, i) => ({
      ...opt,
      is_correct: i === oIndex,
    }));
    setQuiz({ ...quiz, questions: newQuestions });
  };

  if (loading) return <div style={{padding: 40}}>Cargando...</div>;
  if (!quiz || !quiz.questions || quiz.questions.length === 0) return <div style={{padding: 40}}>Error cargando preguntas.</div>;

  const isNextDisabled = isCurrentQuestionBlank || (currentIndex === quiz.questions.length - 1);

  return (
    <>
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
              onChange={(e) => handleQuizChange('title', e.target.value)}
              required
            />
            <button 
              type="submit" 
              className={`btn-main ${isMobile ? 'small' : 'big'} cyan btn-header-action`}
              tabIndex={100}
            >
              <span className="text-desktop">Confirmar</span>
              <span className="text-mobile">Confirmar</span>
            </button>
          </div>
          <textarea
            className="desc-input"
            placeholder="Añade una descripción aquí..."
            tabIndex={2}
            value={quiz.description}
            onChange={(e) => handleQuizChange('description', e.target.value)}
            required
          />
        </div>
      </header>

      <div className="nav-dots pc-dots">
        {quiz.questions.map((q, i) => (
          <div key={i} className={`dot ${i === currentIndex ? 'active' : ''} ${q._deleted ? 'deleted-dot' : ''}`} onClick={() => handleDotClick(i)} style={{ opacity: q._deleted ? 0.3 : 1 }} />
        ))}
      </div>

      <div className="quiz-top-nav-mobile">
        <div className="nav-dots">
          {quiz.questions.map((q, i) => (
            <div key={i} className={`dot ${i === currentIndex ? 'active' : ''}`} onClick={() => handleDotClick(i)} style={{ opacity: q._deleted ? 0.3 : 1 }} />
          ))}
        </div>
      </div>

      <div className="quiz-main-layout">
        <button type="button" className="quiz-slider-btn btn-pc-nav" onClick={handlePrev} disabled={currentIndex === 0}>‹</button>

        <div className="question-card" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ opacity: currentQ._deleted ? 0.6 : 1, backgroundColor: currentQ._deleted ? '#f0f0f0' : 'var(--card-bg)' }}>
          {quiz.questions.length > 1 && (
            <button type="button" className="btn-remove-question-fixed" onClick={() => toggleQuestionDeleted(currentIndex)} tabIndex={-1}>
                {currentQ._deleted ? '↶' : '✕'}
            </button>
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
                value={currentQ.points || ''}
                onChange={(e) => handleQuestionChange(currentIndex, 'points', e.target.value)}
                disabled={currentQ._deleted}
              />
            </div>
          </div>

          <input
            ref={questionInputRef}
            className="input-base question-text-input"
            type="text"
            placeholder="Escribe el enunciado"
            tabIndex={4}
            value={currentQ.text}
            onChange={(e) => handleQuestionChange(currentIndex, 'text', e.target.value)}
            disabled={currentQ._deleted}
          />

          <div className="options-wrapper">
            {currentQ.options.map((o, oIndex) => (
              <div key={oIndex} className="option-item" style={{ opacity: o._deleted ? 0.5 : 1, backgroundColor: o._deleted ? '#e0e0e0' : 'transparent' }}>
                <input
                  type="radio"
                  name={`correct-${currentIndex}`}
                  checked={o.is_correct}
                  onChange={() => handleCorrectOptionChange(currentIndex, oIndex)}
                  tabIndex={-1}
                  disabled={currentQ._deleted || o._deleted}
                />
                <input
                  className="input-base"
                  type="text"
                  placeholder={`Opción ${oIndex + 1}`}
                  tabIndex={5 + oIndex}
                  value={o.text}
                  onChange={(e) => handleOptionChange(currentIndex, oIndex, e.target.value)}
                  disabled={currentQ._deleted || o._deleted}
                />
                {currentQ.options.length > 2 && !currentQ._deleted && (
                  <button type="button" className="btn-remove" tabIndex={-1} onClick={() => toggleOptionDeleted(currentIndex, oIndex)}>
                    {o._deleted ? '↶' : '✕'}
                  </button>
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
    
    {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Confirmar Cambios</h2>
                    <p>¿Estás seguro de que quieres guardar los cambios? Esto actualizará el cuestionario y aplicará los borrados.</p>
                </div>
                <div className="modal-actions" style={{ flexDirection: 'column', gap: '10px' }}>
                    <button className="btn-modal-primary cyan" onClick={confirmSubmit} style={{ width: '100%' }}>
                        Guardar cambios
                    </button>
                    <button className="btn-modal-secondary" onClick={() => setIsModalOpen(false)} style={{ width: '100%' }}>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default EditQuiz;