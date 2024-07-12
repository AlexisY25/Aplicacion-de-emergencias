import { ActivityIndicator,StyleSheetProperties, StyleSheet, Text, View, Button, Image, Alert, StatusBar as RNStatusBar } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite/next';
import * as SQLite from 'expo-sqlite/legacy';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';
import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import Principal from './src/page/Principal';

const Stack = createNativeStackNavigator();

const loadDatabase = async () => {
  const dbName = "parcial2.db";
  const dbAsset = require("./assets/parcial2.db");
  const dbUri = Asset.fromModule(dbAsset).uri;
  const dbFilePath = `${FileSystem.documentDirectory}SQLite/${dbName}`;

  const fileInfo = await FileSystem.getInfoAsync(dbFilePath);
  if (!fileInfo.exists) {
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}SQLite`,
      { intermediates: true }
    );
    await FileSystem.downloadAsync(dbUri, dbFilePath);
  }
};

const db = SQLite.openDatabase('parcial2.db');

const saveImageToDB = async (base64Image: SQLite.SQLStatementArg) => {
  console.log('Base64 image:', base64Image); // Verifica que base64Image tenga datos válidos
  db.transaction(tx => {
    tx.executeSql(
      'CREATE TABLE IF NOT EXISTS agenda (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, title TEXT NOT NULL, description TEXT, photo BLOB);'
    );
    tx.executeSql(
      'INSERT INTO agenda (photo) VALUES (?);',
      [base64Image],
      (_, result) => {
        if (result.rowsAffected > 0) {
          Alert.alert('Éxito', 'Imagen guardada en la base de datos.');
        }
        tx.executeSql('COMMIT;');
      },
      (tx, error) => {
        console.error('Error inserting image:', error);
        return false;
      }
    );
  });
};

const getImageFromDB = async (setImage: (image: string | null) => void) => {
  db.transaction(tx => {
    tx.executeSql(
      'SELECT photo FROM agenda ORDER BY id DESC LIMIT 1;',
      [],
      (_, { rows }) => {
        console.log('Rows:', rows); // Verifica qué se está recuperando de la base de datos
        if (rows.length > 0) {
          setImage(rows._array[0].foto);
        } else {
          setImage(null); // Si no hay imagen en la base de datos
        }
      },
      (tx, error) => {
        console.error('Error fetching image:', error);
        return false;
      }
    );
  });
};

const pickImage = async (setImage: (image: string | null) => void) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permiso necesario', 'Por favor, permite el acceso a la galería para seleccionar una imagen.');
    return;
  }

  let result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    base64: true,
    quality: 1,
  });

  if (!result.canceled) {
    const base64Image = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
    await saveImageToDB(base64Image);
    setImage(base64Image);
  }
};

export default function App() {
  const [dbLoaded, setDbLoaded] = React.useState(false);
  const [image, setImage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        await loadDatabase();
        setDbLoaded(true);
        await getImageFromDB(setImage);
      } catch (error) {
        console.error('Error loading database:', error);
      }
    };

    loadData();
  }, []);

  if (!dbLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Cargando base de datos...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <React.Suspense
        fallback={
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text>Cargando base de datos...</Text>
          </View>
        }
      >
        <SQLiteProvider
          databaseName='parcial2.db'
          useSuspense
        >
          <Stack.Navigator>
            <Stack.Screen 
              name='Home'
              component={Principal}
              options={{
                headerTitle: "Aplicación 911",
                headerLargeTitle: true,
                headerTintColor:'red'
              }}
            />
          </Stack.Navigator>
        </SQLiteProvider>
      </React.Suspense>
      {image && (
        <Image
          source={{ uri: `data:image/png;base64,${image}` }}
          style={styles.image}
        />
      )}
      <RNStatusBar />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  image: {
    width: 200,
    height: 200,
    marginTop: 20,
  },
  titulo:{
    color:'red'
  }
});