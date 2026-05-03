import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  createProduct,
  getProducts,
  deleteProduct,
  updateProduct,
} from "../firebase/productService";

export default function HomeScreen({ navigation, route }) {
  const [name, setName] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [priceCents, setPriceCents] = useState(null);
  const [barcode, setBarcode] = useState("");
  const [products, setProducts] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);

  function formatCentsToBRL(cents) {
    if (typeof cents !== "number" || Number.isNaN(cents)) {
      return "";
    }

    const negative = cents < 0;
    const absolute = Math.abs(cents);
    const value = (absolute / 100).toFixed(2);
    const [intPart, decPart] = value.split(".");
    const intWithSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const sign = negative ? "-" : "";

    return `${sign}R$ ${intWithSeparators},${decPart}`;
  }

  function parsePriceToCents(value) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      if (Number.isInteger(value)) {
        return value;
      }

      return Math.round(value * 100);
    }

    const text = String(value).trim();

    if (!text) {
      return null;
    }

    const hasComma = text.includes(",");
    const hasDot = text.includes(".");

    if (!hasComma && !hasDot) {
      const intValue = parseInt(text.replace(/\D/g, ""), 10);

      if (Number.isNaN(intValue)) {
        return null;
      }

      return intValue * 100;
    }

    const lastComma = text.lastIndexOf(",");
    const lastDot = text.lastIndexOf(".");
    const separatorIndex = Math.max(lastComma, lastDot);
    const integerPart = text.slice(0, separatorIndex).replace(/\D/g, "");
    const fractionalPart = text.slice(separatorIndex + 1).replace(/\D/g, "");

    if (!integerPart && !fractionalPart) {
      return null;
    }

    const intValue = integerPart ? parseInt(integerPart, 10) : 0;
    const fraction = fractionalPart.slice(0, 2).padEnd(2, "0");
    const fracValue = parseInt(fraction || "0", 10);

    return intValue * 100 + fracValue;
  }

  function formatPriceForDisplay(value) {
    const cents = parsePriceToCents(value);

    if (cents === null) {
      if (value === null || value === undefined || value === "") {
        return "Não informado";
      }

      return String(value);
    }

    return formatCentsToBRL(cents);
  }

  function setPriceFromValue(value) {
    const cents = parsePriceToCents(value);

    if (cents === null) {
      setPriceInput("");
      setPriceCents(null);
      return;
    }

    setPriceCents(cents);
    setPriceInput(formatCentsToBRL(cents));
  }

  async function loadProducts() {
    try {
      const productList = await getProducts();
      setProducts(productList);
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível carregar os produtos.");
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const scannedBarcode = route.params?.scannedBarcode;

    if (scannedBarcode !== null && scannedBarcode !== undefined) {
      setBarcode(String(scannedBarcode));
      navigation.setParams({ scannedBarcode: undefined });
    }
  }, [navigation, route.params?.scannedBarcode]);

  function clearForm() {
    setName("");
    setPriceInput("");
    setPriceCents(null);
    setBarcode("");
    setEditingProductId(null);
  }

  function handlePriceChange(text) {
    const digits = text.replace(/\D/g, "");

    if (!digits) {
      setPriceInput("");
      setPriceCents(null);
      return;
    }

    const cents = parseInt(digits, 10);
    setPriceCents(cents);
    setPriceInput(formatCentsToBRL(cents));
  }

  async function handleSaveProduct() {
    if (!name.trim() || priceCents === null) {
      Alert.alert("Atenção", "Preencha nome e preço do produto.");
      return;
    }

    const productData = {
      name: name.trim(),
      price: priceCents,
      barcode: barcode ? String(barcode).trim() : "",
    };

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, productData);
        Alert.alert("Sucesso", "Produto atualizado com sucesso!");
      } else {
        await createProduct(productData);
        Alert.alert("Sucesso", "Produto cadastrado com sucesso!");
      }

      clearForm();
      await loadProducts();
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível salvar o produto.");
    }
  }

  function handleEditProduct(product) {
    setName(product.name || "");
    setPriceFromValue(product.price);
    setBarcode(product.barcode || "");
    setEditingProductId(product.id);
  }

  function handleCancelEdit() {
    clearForm();
  }

  async function handleDeleteProduct(productId) {
    const confirmDelete = window.confirm(
      "Tem certeza que deseja excluir este produto?",
    );

    if (!confirmDelete) return;

    try {
      await deleteProduct(productId);

      if (editingProductId === productId) {
        clearForm();
      }

      Alert.alert("Sucesso", "Produto excluído com sucesso!");
      await loadProducts();
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível excluir o produto.");
    }
  }

  function handleOpenScanner() {
    navigation.navigate("BarcodeScanner");
  }

  function renderHeader() {
    return (
      <View>
        <Text style={{ fontSize: 24, marginTop: 40, marginBottom: 20 }}>
          Bem-vindo!
        </Text>

        <View style={{ marginBottom: 20 }}>
          <Button title="Ler código de barras" onPress={handleOpenScanner} />
        </View>

        <TextInput
          placeholder="Nome do produto"
          value={name}
          onChangeText={setName}
          style={{
            borderWidth: 1,
            marginBottom: 10,
            padding: 10,
            borderRadius: 5,
          }}
        />

        <TextInput
          placeholder="Preço"
          value={priceInput}
          onChangeText={handlePriceChange}
          keyboardType="numeric"
          style={{
            borderWidth: 1,
            marginBottom: 10,
            padding: 10,
            borderRadius: 5,
          }}
        />

        <TextInput
          placeholder="Código de barras"
          value={barcode}
          onChangeText={setBarcode}
          style={{
            borderWidth: 1,
            marginBottom: 20,
            padding: 10,
            borderRadius: 5,
          }}
        />

        <Button
          title={editingProductId ? "Atualizar produto" : "Cadastrar produto"}
          onPress={handleSaveProduct}
        />

        {editingProductId && (
          <View style={{ marginTop: 10 }}>
            <Button title="Cancelar edição" onPress={handleCancelEdit} />
          </View>
        )}

        <Text style={{ fontSize: 20, marginTop: 30, marginBottom: 10 }}>
          Produtos cadastrados
        </Text>
      </View>
    );
  }

  function renderFooter() {
    return (
      <View style={{ marginTop: 20 }}>
        <Button title="Sair" onPress={() => navigation.navigate("Login")} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={<Text>Nenhum produto cadastrado.</Text>}
        renderItem={({ item }) => (
          <View
            style={{
              borderWidth: 1,
              borderRadius: 5,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <Text>Nome: {item.name}</Text>
            <Text>Preço: {formatPriceForDisplay(item.price)}</Text>
            <Text>Código de barras: {item.barcode || "Não informado"}</Text>

            <View style={{ marginTop: 10 }}>
              <Button title="Editar" onPress={() => handleEditProduct(item)} />
            </View>

            <View style={{ marginTop: 10 }}>
              <Button
                title="Excluir"
                onPress={() => handleDeleteProduct(item.id)}
              />
            </View>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}