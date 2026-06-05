import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';
import { RootStackParamList } from '../../App';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Quiz'>;

interface Question {
  id: number;
  text: string;
  options: string[];
}

interface Quiz {
  id: number;
  title: string;
  questions: Question[];
}

export default function QuizScreen({ route, navigation }: Props) {
  const { quizId } = route.params;
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number, total: number } | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuiz(response.data);
      setSelectedAnswers(new Array(response.data.questions.length).fill(-1));
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    const updatedAnswers = [...selectedAnswers];
    updatedAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(updatedAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (selectedAnswers.includes(-1)) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(`${API_URL}/quizzes/${quizId}/submit`, {
        answers: selectedAnswers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult({ score: response.data.attempt.score, total: response.data.attempt.total });
    } catch (err) {
      Alert.alert('Error', 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#0000ff" /></View>;
  if (!quiz) return <View style={styles.centered}><Text>Quiz not found</Text></View>;

  if (result) {
    return (
      <View style={styles.centered}>
        <Text style={styles.resultTitle}>Quiz Completed!</Text>
        <Text style={styles.scoreText}>Your Score: {result.score} / {result.total}</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Back to Module</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.progressText}>Question {currentQuestionIndex + 1} of {quiz.questions.length}</Text>
      <Text style={styles.questionText}>{currentQuestion.text}</Text>

      {currentQuestion.options.map((option, index) => (
        <TouchableOpacity 
          key={index}
          style={[
            styles.optionButton, 
            selectedAnswers[currentQuestionIndex] === index && styles.optionSelected
          ]}
          onPress={() => handleSelectOption(index)}
        >
          <Text style={[
            styles.optionText,
            selectedAnswers[currentQuestionIndex] === index && styles.optionTextSelected
          ]}>{option}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity 
        style={[styles.button, submitting && { opacity: 0.7 }]} 
        onPress={handleNext}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.buttonText}>
            {currentQuestionIndex === quiz.questions.length - 1 ? 'Submit Quiz' : 'Next Question'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  optionSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 22,
    color: '#28a745',
    marginBottom: 30,
  }
});
