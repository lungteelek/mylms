import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import { RootStackParamList } from '../../App';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type CreateCourseNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateCourse'>;

interface Props {
  navigation: CreateCourseNavigationProp;
}

export default function CreateCourseScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const handleCreate = async () => {
    if (!title) {
      Alert.alert('Error', 'Please enter a course title');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/courses`, {
        title,
        description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Success', 'Course created successfully! You can now add modules.', [
        { text: 'OK', onPress: () => navigation.navigate('InstructorDashboard') }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Course Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Advanced Photography"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description (Optional)</Text>
      <Text style={styles.hint}>Tip: If you leave this simple, Gemini AI will help expand it!</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="What will students learn?"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Course</Text>}
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
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
