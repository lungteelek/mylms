import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';
import { RootStackParamList } from '../../App';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseDetails'>;

interface Module {
  id: number;
  title: string;
  content: string;
  videoUrl: string;
}

interface CourseDetails {
  id: number;
  title: string;
  description: string;
  modules: Module[];
}

export default function CourseDetailsScreen({ route, navigation }: Props) {
  const { courseId } = route.params;
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchCourseDetails();
    if (token) checkEnrollmentStatus();
  }, [courseId, token]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/courses/${courseId}`);
      setCourse(response.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to fetch course details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_URL}/enrollments/status/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnrolled(response.data.enrolled);
    } catch (err) {
      console.error('Failed to check enrollment status', err);
    }
  };

  const handleEnroll = async () => {
    if (!token) {
      alert('Please login to enroll');
      return;
    }

    try {
      setLoading(true);
      // Create a payment session
      const response = await axios.post(`${API_URL}/payments/create-session`, { courseId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { sessionId, amount, courseTitle } = response.data;
      
      navigation.navigate('Payment', {
        courseId,
        title: courseTitle,
        amount,
        sessionId
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Course not found'}</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.description}>{course.description}</Text>
      
      <Text style={styles.sectionTitle}>Modules</Text>
      {course.modules.length > 0 ? (
        course.modules.map((item) => (
          <View key={item.id} style={styles.moduleItem}>
            <Text style={styles.moduleTitle}>{item.title}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No modules added yet.</Text>
      )}

      <View style={styles.buttonContainer}>
        {enrolled ? (
          <Button title="Already Enrolled" disabled onPress={() => {}} />
        ) : (
          <Button title="Enroll Now" onPress={handleEnroll} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 10,
  },
  moduleItem: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 30,
  }
});
