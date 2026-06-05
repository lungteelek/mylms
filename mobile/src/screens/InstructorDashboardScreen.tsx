import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import { RootStackParamList } from '../../App';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type InstructorDashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'InstructorDashboard'>;

interface Course {
  id: number;
  title: string;
  _count: { enrollments: number };
}

interface Props {
  navigation: InstructorDashboardNavigationProp;
}

export default function InstructorDashboardScreen({ navigation }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchMyCourses();
  }, [token]);

  const fetchMyCourses = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/courses/instructor`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to fetch your courses');
      console.error(err);
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

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>My Courses</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('CreateCourse')}
        >
          <Text style={styles.addButtonText}>+ New Course</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.courseItem}>
            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle}>{item.title}</Text>
              <Text style={styles.studentCount}>{item._count.enrollments} Students enrolled</Text>
            </View>
            <TouchableOpacity 
              style={styles.manageButton}
              onPress={() => navigation.navigate('AddModule', { courseId: item.id, title: item.title })}
            >
              <Text style={styles.manageButtonText}>Add Module</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>You haven't created any courses yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  courseItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseInfo: {
    marginBottom: 12,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  studentCount: {
    color: '#666',
    marginTop: 4,
  },
  manageButton: {
    borderWidth: 1,
    borderColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  manageButtonText: {
    color: '#007bff',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  }
});
