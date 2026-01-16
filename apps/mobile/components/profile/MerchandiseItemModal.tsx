import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

// Trusted merchandise providers
const TRUSTED_PROVIDERS = [
  { domain: 'spri.ng', name: 'Spring' },
  { domain: 'spring.com', name: 'Spring' },
  { domain: 'teespring.com', name: 'Spring' },
  { domain: 'shopify.com', name: 'Shopify' },
  { domain: 'myshopify.com', name: 'Shopify' },
  { domain: 'etsy.com', name: 'Etsy' },
  { domain: 'redbubble.com', name: 'Redbubble' },
  { domain: 'teepublic.com', name: 'TeePublic' },
  { domain: 'printful.com', name: 'Printful' },
  { domain: 'printify.com', name: 'Printify' },
  { domain: 'bonfire.com', name: 'Bonfire' },
  { domain: 'merchbar.com', name: 'Merchbar' },
  { domain: 'bigcartel.com', name: 'Big Cartel' },
  { domain: 'squarespace.com', name: 'Squarespace' },
  { domain: 'gumroad.com', name: 'Gumroad' },
  { domain: 'amazon.com', name: 'Amazon' },
  { domain: 'ebay.com', name: 'eBay' },
];

function isValidMerchUrl(url: string): { valid: boolean; provider?: string; error?: string } {
  if (!url || !url.trim()) {
    return { valid: false, error: 'Product URL is required' };
  }

  try {
    const parsed = new URL(url.trim().toLowerCase());
    const hostname = parsed.hostname.replace(/^www\./, '');

    for (const provider of TRUSTED_PROVIDERS) {
      if (hostname === provider.domain || hostname.endsWith('.' + provider.domain)) {
        return { valid: true, provider: provider.name };
      }
    }

    return {
      valid: false,
      error: 'Please use a trusted merchandise provider (Spring, Shopify, Etsy, Redbubble, etc.)',
    };
  } catch {
    return { valid: false, error: 'Please enter a valid URL' };
  }
}

interface MerchItem {
  id: string;
  name: string;
  description?: string;
  price_cents?: number;
  url?: string;
  image_url?: string;
}

interface MerchandiseItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  profileId: string;
  editingItem?: MerchItem | null;
  colors: any;
}

export default function MerchandiseItemModal({
  visible,
  onClose,
  onSave,
  profileId,
  editingItem,
  colors,
}: MerchandiseItemModalProps) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('url');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlProvider, setUrlProvider] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (editingItem) {
        setName(editingItem.name || '');
        setDescription(editingItem.description || '');
        setPrice(editingItem.price_cents ? (editingItem.price_cents / 100).toFixed(2) : '');
        setProductUrl(editingItem.url || '');
        setImageUrl(editingItem.image_url || '');
        setImagePreview(editingItem.image_url || null);
        setImageSource('url');
        // Validate existing URL
        if (editingItem.url) {
          const result = isValidMerchUrl(editingItem.url);
          setUrlError(result.valid ? null : result.error || null);
          setUrlProvider(result.provider || null);
        }
      } else {
        resetForm();
      }
    }
  }, [visible, editingItem]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setProductUrl('');
    setImageSource('url');
    setImageUrl('');
    setImageFile(null);
    setImagePreview(null);
    setUrlError(null);
    setUrlProvider(null);
  };

  const handleUrlChange = (text: string) => {
    setProductUrl(text);
    if (text.trim()) {
      const result = isValidMerchUrl(text);
      setUrlError(result.valid ? null : result.error || null);
      setUrlProvider(result.provider || null);
    } else {
      setUrlError(null);
      setUrlProvider(null);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setImageFile(result.assets[0]);
      setImagePreview(result.assets[0].uri);
      setImageSource('upload');
    } catch (err) {
      console.error('[MerchandiseItemModal] Error picking image:', err);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadImage = async (uri: string, itemId: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const ext = uri.split('.').pop() || 'jpg';
    const path = `merch/${profileId}/${itemId}.${ext}`;

    const { error } = await supabase.storage
      .from('profile-assets')
      .upload(path, blob, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('profile-assets')
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const parsePriceToCents = (input: string): number | null => {
    const raw = input.trim();
    if (!raw) return null;
    const cleaned = raw.replace(/,/g, '').replace(/^\$/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
      return null;
    }
    const [dollarsStr, centsStrRaw] = cleaned.split('.');
    const dollars = Number(dollarsStr);
    const centsStr = (centsStrRaw ?? '').padEnd(2, '0');
    const cents = centsStr ? Number(centsStr) : 0;
    return dollars * 100 + cents;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }

    const urlValidation = isValidMerchUrl(productUrl);
    if (!urlValidation.valid) {
      Alert.alert('Invalid URL', urlValidation.error || 'Please use a trusted merchandise provider');
      return;
    }

    const priceCents = parsePriceToCents(price);
    if (price.trim() && priceCents === null) {
      Alert.alert('Error', 'Please enter a valid price (e.g., 29.99)');
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = imageUrl;

      // Upload image if user selected a file
      if (imageSource === 'upload' && imageFile) {
        const itemId = editingItem?.id || crypto.randomUUID();
        finalImageUrl = await uploadImage(imageFile.uri, itemId);
      }

      const payload = {
        p_item: {
          id: editingItem?.id || null,
          name: name.trim(),
          description: description.trim() || null,
          price_cents: priceCents,
          currency: 'USD',
          url: productUrl.trim(),
          image_url: finalImageUrl || null,
          is_featured: false,
          sort_order: 0,
        },
      };

      const { error } = await supabase.rpc('upsert_profile_merch_item', payload);

      if (error) throw error;

      onSave();
      onClose();
      resetForm();
    } catch (err: any) {
      console.error('[MerchandiseItemModal] Save error:', err);
      Alert.alert('Error', err.message || 'Failed to save merchandise item');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
      resetForm();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} disabled={saving}>
            <Feather name="x" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {editingItem ? 'Edit Merchandise' : 'Add Merchandise'}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={saving || !!urlError}
            style={[
              styles.saveBtn,
              { backgroundColor: urlError ? colors.mutedText : colors.primary },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.infoBannerText, { color: colors.mutedText }]}>
              Merchandise is sold through third-party platforms. Link to your products on Spring, Shopify, Etsy, or other trusted providers.
            </Text>
          </View>

          {/* Product Name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Product Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder="T-Shirt, Hoodie, Poster, etc."
              placeholderTextColor={colors.mutedText}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Product description (optional)"
              placeholderTextColor={colors.mutedText}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Price */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Price (Display Only)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={price}
              onChangeText={setPrice}
              placeholder="29.99"
              placeholderTextColor={colors.mutedText}
              keyboardType="decimal-pad"
            />
            <Text style={[styles.helperText, { color: colors.mutedText }]}>
              This is for display only. Actual price is set on your store.
            </Text>
          </View>

          {/* Product URL */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Product URL *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: urlError ? '#ef4444' : colors.border, color: colors.text },
              ]}
              value={productUrl}
              onChangeText={handleUrlChange}
              placeholder="https://spri.ng/your-product"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="none"
              keyboardType="url"
            />
            {urlError && (
              <Text style={styles.errorText}>{urlError}</Text>
            )}
            {urlProvider && !urlError && (
              <View style={styles.providerBadge}>
                <Feather name="check-circle" size={14} color="#22c55e" />
                <Text style={styles.providerBadgeText}>Linked to {urlProvider}</Text>
              </View>
            )}
          </View>

          {/* Trusted Providers Info */}
          <View style={[styles.providersInfo, { borderColor: colors.border }]}>
            <Text style={[styles.providersTitle, { color: colors.text }]}>Supported Providers</Text>
            <Text style={[styles.providersList, { color: colors.mutedText }]}>
              Spring · Shopify · Etsy · Redbubble · TeePublic · Printful · Printify · Bonfire · Merchbar · Big Cartel · Gumroad · Amazon · eBay
            </Text>
          </View>

          {/* Image Source Toggle */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Product Image</Text>
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.toggleBtn,
                  { borderColor: colors.border },
                  imageSource === 'url' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setImageSource('url')}
              >
                <Feather name="link" size={16} color={imageSource === 'url' ? '#fff' : colors.text} />
                <Text style={[styles.toggleText, { color: imageSource === 'url' ? '#fff' : colors.text }]}>
                  Image URL
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleBtn,
                  { borderColor: colors.border },
                  imageSource === 'upload' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setImageSource('upload')}
              >
                <Feather name="upload" size={16} color={imageSource === 'upload' ? '#fff' : colors.text} />
                <Text style={[styles.toggleText, { color: imageSource === 'upload' ? '#fff' : colors.text }]}>
                  Upload
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Image URL Input */}
          {imageSource === 'url' && (
            <View style={styles.field}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={imageUrl}
                onChangeText={(text) => {
                  setImageUrl(text);
                  setImagePreview(text);
                }}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor={colors.mutedText}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          )}

          {/* Image Upload */}
          {imageSource === 'upload' && (
            <View style={styles.field}>
              <Pressable
                style={[styles.uploadBtn, { borderColor: colors.border }]}
                onPress={pickImage}
              >
                <Feather name="image" size={24} color={colors.primary} />
                <Text style={[styles.uploadBtnText, { color: colors.primary }]}>
                  {imageFile ? 'Change Image' : 'Select Image'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Image Preview */}
          {imagePreview && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Image Preview</Text>
              <Image
                source={{ uri: imagePreview }}
                style={[styles.imagePreview, { borderColor: colors.border }]}
                resizeMode="cover"
              />
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  providerBadgeText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  providersInfo: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  providersTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  providersList: {
    fontSize: 11,
    lineHeight: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
  },
});
