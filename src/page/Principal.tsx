import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  Button,
  Platform
} from 'react-native';
import * as SQLite from 'expo-sqlite/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTrashAlt, faEdit } from '@fortawesome/free-solid-svg-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

library.add(faTrashAlt, faEdit);

interface Emergencia {
  id: number;
  date: string;
  title: string;
  description: string;
  photo: string;
}

export default function Home() {
  const db = SQLite.openDatabase('parcial2.db');
  const [emergencia, setEmergencia] = useState<Emergencia[]>([]);
  const [idToUpdate, setIdToUpdate] = useState<number | null>(null); // Estado para almacenar el ID del registro que se actualizará
  const [fecha, setFecha] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState('');
  const [showDatePpicker, setShowDatePpicker] = useState(false);
  const [date, setDate] = useState(new Date()); // Estado para la fecha seleccionada

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM agenda',
        [],
        (_, { rows }) => {
          const resultados = rows._array as Emergencia[];
          setEmergencia(resultados);
        },
        (_, error) => {
          console.error('Error en la consulta SQL:', error);
          return true;
        }
      );
    });
  };

  const setData = async () => {
    if (fecha.length === 0 || titulo.length === 0 || descripcion.length === 0 || foto.length === 0) {
      Alert.alert('Warning!', 'Por favor introduce todos los datos');
    } else {
      try {
        await db.transaction((tx) => {
          tx.executeSql(
            'INSERT INTO agenda (date, title, description, photo) VALUES (?, ?, ?, ?);',
            [fecha, titulo, descripcion, foto],
            (_, { insertId }) => {
              console.log('Registro insertado con ID:', insertId);
              loadData(); // Recargar datos después de la inserción
              resetForm(); // Reiniciar formulario después de la inserción
            }
          );
        });
      } catch (error) {
        console.error('Error al insertar en la base de datos:', error);
      }
    }
  };

  const updateData = async () => {
    if (!idToUpdate || fecha.length === 0 || titulo.length === 0 || descripcion.length === 0 || foto.length === 0) {
      Alert.alert('Warning!', 'Por favor selecciona un registro y completa todos los campos');
      return;
    }

    try {
      await db.transaction((tx) => {
        tx.executeSql(
          'UPDATE agenda SET date=?, title=?, description=?, photo=? WHERE id=?;',
          [fecha, titulo, descripcion, foto, idToUpdate],
          (_, { rowsAffected }) => {
            if (rowsAffected > 0) {
              console.log(`Registro actualizado con ID ${idToUpdate}`);
              setIdToUpdate(null); // Reiniciar el estado de ID para actualizar
              resetForm(); // Reiniciar formulario después de la actualización
              loadData(); // Recargar datos después de la actualización
            }
          }
        );
      });
    } catch (error) {
      console.error('Error al actualizar en la base de datos:', error);
    }
  };

  const removeData = (id: number) => {
    try {
      db.transaction((tx) => {
        tx.executeSql(
          'DELETE FROM agenda WHERE id=?;',
          [id],
          (_, { rowsAffected }) => {
            if (rowsAffected > 0) {
              console.log(`Registro eliminado con ID ${id}`);
              loadData(); // Recargar datos después de la eliminación
            }
          }
        );
      });
    } catch (error) {
      console.error('Error al eliminar en la base de datos:', error);
    }
  };

  const handleEdit = (item: Emergencia) => {
    setIdToUpdate(item.id);
    setFecha(item.date);
    setTitulo(item.title);
    setDescripcion(item.description);
    setFoto(item.photo);
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Por favor, permite el acceso a la galería para seleccionar una imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      base64: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setFoto(result.assets[0].base64 || '');
    }
  };

  const resetForm = () => {
    setFecha('');
    setTitulo('');
    setDescripcion('');
    setFoto('');
  };

  const showDatePicker = () => {
    setShowDatePpicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePpicker(Platform.OS === 'ios');
    setDate(currentDate);
    setFecha(currentDate.toISOString().split('T')[0]); // Formato de fecha YYYY-MM-DD
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 10 }}>
      <ScrollView>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>{idToUpdate ? 'Editar Emergencia' : 'Agregar Emergencia'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Fecha (YYYY-MM-DD)"
            value={fecha}
            onChangeText={(text) => setFecha(text)}
            onFocus={showDatePicker} // Mostrar el selector de fecha al enfocar el campo
          />
          {showDatePpicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Título"
            value={titulo}
            onChangeText={(text) => setTitulo(text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Descripción"
            value={descripcion}
            onChangeText={(text) => setDescripcion(text)}
          />
          <TouchableOpacity style={styles.imagePickerButton} onPress={handleImagePick}>
            <Text style={styles.imagePickerButtonText}>Seleccionar Imagen</Text>
          </TouchableOpacity>
          {foto ? (
            <Image
              source={{ uri: `data:image/png;base64,${foto}` }}
              style={styles.image}
            />
          ) : null}
          <Button
            title={idToUpdate ? 'Actualizar Emergencia' : 'Agregar Emergencia'}
            onPress={idToUpdate ? updateData : setData}
          />
        </View>

        {emergencia.map((item, index) => (
          <View key={index} style={styles.card}>
            <Text>Fecha: {item.date}</Text>
            <Text>Título: {item.title}</Text>
            <Text>Descripción: {item.description}</Text>
            {item.photo && (
              <Image
                source={{ uri: `data:image/png;base64,${item.photo}` }}
                style={styles.image}
              />
            )}
            <View style={styles.actionContainer}>
              <TouchableOpacity style={styles.iconButton} onPress={() => removeData(item.id)}>
                <FontAwesomeIcon icon={faTrashAlt} size={24} style={styles.trashIcon} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => handleEdit(item)}>
                <FontAwesomeIcon icon={faEdit} size={24} style={styles.editIcon} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  imagePickerButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  datePickerContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
  },
  image: {
    width: 200,
    height: 200,
    marginTop: 10,
  },
  iconButton: {
    padding: 10,
  },
  trashIcon: {
    color: '#ff0000',
  },
  editIcon: {
    color: '#74C0FC',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
});
