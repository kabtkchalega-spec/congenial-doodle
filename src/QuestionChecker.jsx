import React, { useState, useEffect } from 'react';
import { supabase } from './api/supabase';
import { checkQuestionWithGemini } from './api/gemini';
import QuestionCard from './components/QuestionCard';
import Button from './components/Button';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

const QuestionChecker = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkingQuestions, setCheckingQuestions] = useState(new Set());

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('new_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsedData = data.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      }));
      setQuestions(parsedData || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions. Please ensure your Supabase project is configured and the "new_questions" table exists with RLS policies allowing public read access.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckQuestion = async (questionId) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    setCheckingQuestions(prev => new Set([...prev, questionId]));
    
    try {
      const isWrong = await checkQuestionWithGemini(question);
      
      // Update Supabase
      const { error: updateError } = await supabase
        .from('new_questions')
        .update({ is_wrong: isWrong })
        .eq('id', questionId);

      if (updateError) throw updateError;

      // Update local state
      setQuestions(prev => prev.map(q => 
        q.id === questionId ? { ...q, is_wrong: isWrong, check_error: false } : q
      ));

    } catch (err) {
      console.error(`Error checking question ${questionId}:`, err);
      setQuestions(prev => prev.map(q => 
        q.id === questionId ? { ...q, is_wrong: true, check_error: true } : q
      ));
      setError(`Failed to check question. Please check your Gemini API key and try again.`);
    } finally {
      setCheckingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-400px)] md:h-[calc(100vh-500px)] text-text text-xl animate-pulse">
        <ArrowPathIcon className="h-12 w-12 text-primary mb-4 animate-spin" />
        Loading questions...
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="text-error text-center p-8 mt-12 bg-surface rounded-xl mx-auto max-w-2xl shadow-lg">
        <ExclamationCircleIcon className="h-16 w-16 text-error mx-auto mb-4" />
        <p className="text-xl font-semibold mb-2">Error Loading Questions</p>
        <p className="text-textSecondary">{error}</p>
        <Button onClick={fetchQuestions} className="mt-6">Retry Loading</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl mt-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 animate-fade-in-up delay-300">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-text text-center md:text-left">Question Checker</h2>
          <p className="text-textSecondary mt-2">Click "Check Question" to validate each question with Gemini AI</p>
        </div>
        <Button
          onClick={fetchQuestions}
          className="px-6 py-3 text-lg"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          Refresh Questions
        </Button>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 mb-6 animate-fade-in-up">
          <p className="text-error text-center">{error}</p>
        </div>
      )}

      {questions.length === 0 && !loading && (
        <div className="text-textSecondary text-center text-lg mt-16 p-8 bg-surface rounded-xl shadow-lg animate-fade-in-up delay-400">
          <ExclamationCircleIcon className="h-16 w-16 text-textSecondary mx-auto mb-4" />
          <p className="text-xl font-semibold mb-2">No Questions Found</p>
          <p>Add some questions to the `new_questions` table in Supabase to get started!</p>
          <Button onClick={fetchQuestions} className="mt-6">Refresh List</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {questions.map((question) => (
          <QuestionCard 
            key={question.id} 
            question={question}
            onCheck={() => handleCheckQuestion(question.id)}
            isChecking={checkingQuestions.has(question.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default QuestionChecker;