import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';

/**
 * Example component demonstrating the performance optimization
 * from O(n) array.find() to O(1) dictionary access
 */
const OptimizationDemo = () => {
  const { canteens, canteensDict, buildings, buildingsDict } = useSelector((state: RootState) => state.canteenReducer);
  const { foodCategories, foodCategoriesDict, markings, markingsDict } = useSelector((state: RootState) => state.foodReducer);

  // Example: Finding a canteen by ID
  const findCanteenById = (id: string) => {
    // OLD WAY: O(n) - Linear search through entire array
    const oldWay = canteens.find(canteen => canteen.id === id);
    
    // NEW WAY: O(1) - Direct dictionary access
    const newWay = canteensDict[id];
    
    console.log(`Finding canteen ${id}:`);
    console.log('Old way result:', oldWay);
    console.log('New way result:', newWay);
    console.log('Results match:', oldWay === newWay);
    
    return newWay; // Use the optimized version
  };

  // Example: Finding a building by ID
  const findBuildingById = (id: string) => {
    // OLD WAY: O(n) - Linear search
    // const oldWay = buildings.find(building => building.id === id);
    
    // NEW WAY: O(1) - Direct access
    return buildingsDict[id];
  };

  // Example: Finding a food category by ID
  const findFoodCategoryById = (id: string) => {
    // OLD WAY: O(n) - Would search through entire array
    // const oldWay = foodCategories.find(category => category.id === id);
    
    // NEW WAY: O(1) - Instant access
    return foodCategoriesDict[id];
  };

  // Example: Finding a marking by ID
  const findMarkingById = (id: string) => {
    // OLD WAY: O(n) - Linear search through markings array
    // const oldWay = markings.find(marking => marking.id === id);
    
    // NEW WAY: O(1) - Direct dictionary lookup
    return markingsDict[id];
  };

  // Performance comparison for bulk operations
  const performanceBenchmark = () => {
    if (canteens.length === 0) return;

    const testId = canteens[0]?.id;
    if (!testId) return;

    const iterations = 1000;
    
    // Benchmark old way
    console.time('Array.find() - O(n)');
    for (let i = 0; i < iterations; i++) {
      canteens.find(canteen => canteen.id === testId);
    }
    console.timeEnd('Array.find() - O(n)');
    
    // Benchmark new way  
    console.time('Dictionary access - O(1)');
    for (let i = 0; i < iterations; i++) {
      canteensDict[testId];
    }
    console.timeEnd('Dictionary access - O(1)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redux Store Optimization Demo</Text>
      <Text style={styles.subtitle}>Performance Comparison: O(n) vs O(1)</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Available:</Text>
        <Text>• Canteens: {canteens.length} items (array + dict)</Text>
        <Text>• Buildings: {buildings.length} items (array + dict)</Text>
        <Text>• Food Categories: {foodCategories.length} items (array + dict)</Text>
        <Text>• Markings: {markings.length} items (array + dict)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Optimization Benefits:</Text>
        <Text>✅ O(1) access time instead of O(n)</Text>
        <Text>✅ Constant performance regardless of data size</Text>
        <Text>✅ Backward compatibility maintained</Text>
        <Text>✅ Arrays still available for iteration</Text>
        <Text>✅ Automatic dict creation in reducers</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.note}>
          Note: Open console to see performance benchmarks when data is loaded.
          The dictionary access is significantly faster than array.find() operations.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  section: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  note: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#888',
  },
});

export default OptimizationDemo;