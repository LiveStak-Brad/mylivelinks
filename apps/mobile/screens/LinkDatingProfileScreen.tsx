import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';

const INTEREST_TAGS = [
  'Music', 'Gaming', 'Fitness', 'Business', 'Art', 'Tech',
  'Travel', 'Food', 'Sports', 'Fashion', 'Photography', 'Reading',
  'Movies', 'Cooking', 'Dancing', 'Yoga', 'Hiking', 'Pets'
];

const ORIENTATION_OPTIONS = [
  { value: 'straight', label: 'Straight' },
  { value: 'gay', label: 'Gay' },
  { value: 'lesbian', label: 'Lesbian' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'pansexual', label: 'Pansexual' },
  { value: 'queer', label: 'Queer' },
  { value: 'asexual', label: 'Asexual' },
  { value: 'questioning', label: 'Questioning' },
  { value: 'other', label: 'Other' },
];

const RELIGION_OPTIONS = ['Christian', 'Muslim', 'Jewish', 'Hindu', 'Buddhist', 'Spiritual', 'Agnostic', 'Atheist', 'Other'];
const BUILD_OPTIONS = ['Slim', 'Average', 'Athletic', 'Curvy', 'Heavyset'];

export default function LinkDatingProfileScreen() {
  const { colors } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [bio, setBio] = useState('');
  const [locationText, setLocationText] = useState('');
  const [lookingForText, setLookingForText] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [build, setBuild] = useState('');
  const [religion, setReligion] = useState('');
  const [orientation, setOrientation] = useState('');
  const [showOrientation, setShowOrientation] = useState(false);
  const [smoker, setSmoker] = useState('');
  const [drinker, setDrinker] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [showMe, setShowMe] = useState('everyone');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('99');
  const [orientationPref, setOrientationPref] = useState<string[]>([]);
  const [smokerPref, setSmokerPref] = useState('');
  const [drinkerPref, setDrinkerPref] = useState('');
  const [religionPref, setReligionPref] = useState<string[]>([]);
  const [heightPrefMin, setHeightPrefMin] = useState('');
  const [heightPrefMax, setHeightPrefMax] = useState('');
  const [buildPref, setBuildPref] = useState<string[]>([]);
  const [interestsPref, setInterestsPref] = useState<string[]>([]);

  const toggleInterest = (tag: string) => {
    setSelectedInterests(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleOrientationPref = (value: string) => {
    setOrientationPref(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleReligionPref = (value: string) => {
    setReligionPref(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleBuildPref = (value: string) => {
    setBuildPref(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleInterestPref = (value: string) => {
    setInterestsPref(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dating Profile</Text>
        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Enable Toggle */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>Enable Dating Mode</Text>
              <Text style={styles.toggleSubtitle}>
                Show your dating profile in the dating swipe stack
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setEnabled(!enabled)}
              style={[styles.toggle, enabled && styles.toggleActive]}
            >
              <View style={[styles.toggleThumb, enabled && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Photos Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Photos <Text style={styles.sectionSubtitle}>(Up to 5)</Text>
          </Text>
          <View style={styles.photoGrid}>
            {photos.map((photo, idx) => (
              <View key={idx} style={styles.photoSlot}>
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoIndex}>{idx + 1}</Text>
                </View>
                <TouchableOpacity style={styles.removePhotoButton}>
                  <Text style={styles.removePhotoText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity style={styles.addPhotoButton}>
                <Text style={styles.addPhotoIcon}>+</Text>
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* About You Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About You</Text>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="Age"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Height</Text>
              <View style={styles.input}>
                <Text style={styles.selectText}>{height || 'Prefer not to say'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Build</Text>
              <View style={styles.input}>
                <Text style={styles.selectText}>{build || 'Prefer not to say'}</Text>
              </View>
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Religion</Text>
              <View style={styles.input}>
                <Text style={styles.selectText}>{religion || 'Prefer not to say'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Orientation (Optional)</Text>
              <View style={styles.input}>
                <Text style={styles.selectText}>{orientation || 'Prefer not to say'}</Text>
              </View>
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Show on Card</Text>
              <TouchableOpacity
                onPress={() => setShowOrientation(!showOrientation)}
                style={[styles.toggleSmall, showOrientation && styles.toggleActive]}
              >
                <View style={[styles.toggleThumbSmall, showOrientation && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Smoker</Text>
              <View style={styles.input}>
                <Text style={styles.selectText}>{smoker || 'Prefer not to say'}</Text>
              </View>
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Drinker</Text>
              <View style={styles.input}>
                <Text style={styles.selectText}>{drinker || 'Prefer not to say'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Dating Bio</Text>
            <TextInput
              style={styles.textArea}
              value={bio}
              onChangeText={setBio}
              placeholder="What are you looking for?"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Looking For (short text)</Text>
            <TextInput
              style={styles.input}
              value={lookingForText}
              onChangeText={setLookingForText}
              placeholder="e.g., Long-term relationship, casual dating..."
              placeholderTextColor="#999"
              maxLength={100}
            />
            <Text style={styles.helperText}>Max 100 characters</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Hobbies / Interests</Text>
            <View style={styles.tagContainer}>
              {INTEREST_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleInterest(tag)}
                  style={[
                    styles.tag,
                    selectedInterests.includes(tag) && styles.tagSelected
                  ]}
                >
                  <Text style={[
                    styles.tagText,
                    selectedInterests.includes(tag) && styles.tagTextSelected
                  ]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Location (Optional)</Text>
            <TextInput
              style={styles.input}
              value={locationText}
              onChangeText={setLocationText}
              placeholder="e.g., Los Angeles, CA"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Who You're Looking For Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Who You're Looking For</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Show Me</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity style={styles.picker}>
                <Text style={styles.pickerText}>{showMe === 'everyone' ? 'Everyone' : showMe === 'men' ? 'Men' : 'Women'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Age Range</Text>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <TextInput
                  style={styles.input}
                  value={ageMin}
                  onChangeText={setAgeMin}
                  placeholder="Min"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.halfWidth}>
                <TextInput
                  style={styles.input}
                  value={ageMax}
                  onChangeText={setAgeMax}
                  placeholder="Max"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Orientation Preference</Text>
            <Text style={styles.helperText}>
              We only filter orientation if you pick at least one option below.
            </Text>
            <View style={styles.tagContainer}>
              <TouchableOpacity 
                onPress={() => setOrientationPref([])}
                style={[styles.tag, orientationPref.length === 0 && styles.tagSelected]}
              >
                <Text style={[styles.tagText, orientationPref.length === 0 && styles.tagTextSelected]}>
                  Doesn't matter
                </Text>
              </TouchableOpacity>
              {ORIENTATION_OPTIONS.map((option) => (
                <TouchableOpacity 
                  key={option.value} 
                  onPress={() => toggleOrientationPref(option.value)}
                  style={[styles.tag, orientationPref.includes(option.value) && styles.tagSelected]}
                >
                  <Text style={[styles.tagText, orientationPref.includes(option.value) && styles.tagTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Smoker Preference</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity style={styles.picker}>
                <Text style={styles.pickerText}>
                  {smokerPref === 'yes' ? 'Okay with smoker' : smokerPref === 'no' ? 'Not okay with smoker' : "Doesn't matter"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Drinker Preference</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity style={styles.picker}>
                <Text style={styles.pickerText}>
                  {drinkerPref === 'yes' ? 'Okay with drinker' : drinkerPref === 'no' ? 'Not okay with drinker' : drinkerPref === 'socially' ? 'Socially only' : "Doesn't matter"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Religion Preference</Text>
            <View style={styles.tagContainer}>
              <TouchableOpacity 
                onPress={() => setReligionPref([])}
                style={[styles.tag, religionPref.length === 0 && styles.tagSelected]}
              >
                <Text style={[styles.tagText, religionPref.length === 0 && styles.tagTextSelected]}>
                  Doesn't matter
                </Text>
              </TouchableOpacity>
              {RELIGION_OPTIONS.map((rel) => (
                <TouchableOpacity 
                  key={rel} 
                  onPress={() => toggleReligionPref(rel.toLowerCase())}
                  style={[styles.tag, religionPref.includes(rel.toLowerCase()) && styles.tagSelected]}
                >
                  <Text style={[styles.tagText, religionPref.includes(rel.toLowerCase()) && styles.tagTextSelected]}>
                    {rel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Height Preference</Text>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <TouchableOpacity style={styles.picker}>
                  <Text style={styles.pickerText}>
                    {heightPrefMin === 'short' ? "Under 5'4\"" : heightPrefMin === 'average' ? "5'4\"" : heightPrefMin === 'tall' ? "5'10\"" : heightPrefMin === 'very-tall' ? "6'3\"" : 'Min (Any)'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.halfWidth}>
                <TouchableOpacity style={styles.picker}>
                  <Text style={styles.pickerText}>
                    {heightPrefMax === 'short' ? "5'4\"" : heightPrefMax === 'average' ? "5'9\"" : heightPrefMax === 'tall' ? "6'2\"" : heightPrefMax === 'very-tall' ? "Over 6'2\"" : 'Max (Any)'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Build Preference</Text>
            <View style={styles.tagContainer}>
              <TouchableOpacity 
                onPress={() => setBuildPref([])}
                style={[styles.tag, buildPref.length === 0 && styles.tagSelected]}
              >
                <Text style={[styles.tagText, buildPref.length === 0 && styles.tagTextSelected]}>
                  Doesn't matter
                </Text>
              </TouchableOpacity>
              {BUILD_OPTIONS.map((b) => (
                <TouchableOpacity 
                  key={b} 
                  onPress={() => toggleBuildPref(b.toLowerCase())}
                  style={[styles.tag, buildPref.includes(b.toLowerCase()) && styles.tagSelected]}
                >
                  <Text style={[styles.tagText, buildPref.includes(b.toLowerCase()) && styles.tagTextSelected]}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Interests Preference</Text>
            <View style={styles.tagContainer}>
              <TouchableOpacity 
                onPress={() => setInterestsPref([])}
                style={[styles.tag, interestsPref.length === 0 && styles.tagSelected]}
              >
                <Text style={[styles.tagText, interestsPref.length === 0 && styles.tagTextSelected]}>
                  Doesn't matter
                </Text>
              </TouchableOpacity>
              {INTEREST_TAGS.map((tag) => (
                <TouchableOpacity 
                  key={tag} 
                  onPress={() => toggleInterestPref(tag)}
                  style={[styles.tag, interestsPref.includes(tag) && styles.tagSelected]}
                >
                  <Text style={[styles.tagText, interestsPref.includes(tag) && styles.tagTextSelected]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ec4899',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbcfe8',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionSubtitle: {
    color: '#6b7280',
    fontWeight: '400',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d1d5db',
    padding: 4,
  },
  toggleActive: {
    backgroundColor: '#ec4899',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    transform: [{ translateX: 24 }],
  },
  toggleSmall: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d1d5db',
    padding: 4,
    marginTop: 8,
  },
  toggleThumbSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoSlot: {
    width: '30%',
    aspectRatio: 1,
    position: 'relative',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIndex: {
    fontSize: 24,
    color: '#9ca3af',
    fontWeight: '600',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  addPhotoButton: {
    width: '30%',
    aspectRatio: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoIcon: {
    fontSize: 32,
    color: '#9ca3af',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  selectText: {
    color: '#000',
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    fontSize: 15,
    minHeight: 100,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  tagSelected: {
    backgroundColor: '#ec4899',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  tagTextSelected: {
    color: '#fff',
  },
  pickerContainer: {
    marginTop: 8,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  pickerText: {
    color: '#000',
    fontSize: 15,
  },
});
