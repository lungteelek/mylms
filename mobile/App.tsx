import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import CourseDetailsScreen from './src/screens/CourseDetailsScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import InstructorDashboardScreen from './src/screens/InstructorDashboardScreen';
import CreateCourseScreen from './src/screens/CreateCourseScreen';
import AddModuleScreen from './src/screens/AddModuleScreen';
import QuizScreen from './src/screens/QuizScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';

export type RootStackParamList = {
  Home: undefined;
  CourseDetails: { courseId: number; title: string };
  Dashboard: undefined;
  Login: undefined;
  Register: undefined;
  Payment: { courseId: number; title: string; amount: number; sessionId: string };
  InstructorDashboard: undefined;
  CreateCourse: undefined;
  AddModule: { courseId: number; title: string };
  Quiz: { quizId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={token ? (isInstructor ? "InstructorDashboard" : "Home") : "Login"}>
        {token ? (
          <>
            {/* Common Screens */}
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'LMS Platform' }} />
            <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={({ route }) => ({ title: route.params.title })} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'My Dashboard' }} />
            <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Checkout' }} />

            {/* Instructor Specific Screens */}
            {isInstructor && (
              <>
                <Stack.Screen name="InstructorDashboard" component={InstructorDashboardScreen} options={{ title: 'Instructor Panel' }} />
                <Stack.Screen name="CreateCourse" component={CreateCourseScreen} options={{ title: 'New Course' }} />
                <Stack.Screen name="AddModule" component={AddModuleScreen} options={{ title: 'Add Content' }} />
              </>
            )}
            <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: 'Module Quiz' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
