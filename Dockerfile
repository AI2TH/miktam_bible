# Multi-stage Dockerfile for Android build
FROM reactnativecommunity/react-native-android:latest AS builder

WORKDIR /app

# Copy package descriptors first to leverage docker layer caching
COPY package.json package-lock.json* ./

# Install npm dependencies cleanly inside the container (never touches host)
RUN npm install --legacy-peer-deps

# Copy the rest of the project files
COPY . .

# Grant execution permissions to gradlew
RUN chmod +x android/gradlew

# Build the Android APK
WORKDIR /app/android
CMD ["./gradlew", "assembleRelease", "--no-daemon"]
