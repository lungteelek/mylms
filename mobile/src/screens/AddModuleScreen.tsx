import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { RootStackParamList } from '../../App';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'AddModule'>;

export default function AddModuleScreen({ route, navigation }: Props) {
  const { courseId, title: courseTitle } = route.params;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [videoFile, setVideoFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const { token } = useAuth();

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setVideoFile(result.assets[0]);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const handleSaveModule = async () => {
    if (!title) {
      Alert.alert('Error', 'Please enter a module title');
      return;
    }

    try {
      setUploading(true);
      let videoUrl = '';

      // 1. Upload video if selected
      if (videoFile) {
        const formData = new FormData();
        formData.append('video', {
          uri: videoFile.uri,
          name: videoFile.name,
          type: videoFile.mimeType || 'video/mp4',
        } as any);

        const uploadRes = await axios.post(`${API_URL.replace('/api', '')}/api/upload-video`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });
        videoUrl = uploadRes.data.url;
      }

      // 2. Create module
      await axios.post(`${API_URL}/courses/${courseId}/modules`, {
        title,
        content,
        videoUrl,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Success', 'Module added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add module');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.courseName}>Course: {courseTitle}</Text>
      
      <Text style={styles.label}>Module Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Chapter 1: Introduction"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Text Content</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Enter chapter text here..."
        value={content}
        onChangeText={setContent}
        multiline
      />

      <Text style={styles.label}>Lesson Video</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={pickDocument}>
        <Text style={styles.pickerButtonText}>
          {videoFile ? `Selected: ${videoFile.name}` : 'Choose Video File'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveModule} disabled={uploading}>
        {uploading ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.loaderText}>Uploading & Saving...</Text>
          </View>
        ) : (
          <Text style={styles.saveButtonText}>Save Module</Text>
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
  courseName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  pickerButton: {
    borderWidth: 2,
    borderColor: '#007bff',
    borderStyle: 'dashed',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  pickerButtonText: {
    color: '#007bff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007bff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loaderText: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: 'bold',
  }
});
