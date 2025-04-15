import { configureStore, combineReducers } from '@reduxjs/toolkit';
import reducer from './reducer';

const store = configureStore({
    reducer: combineReducers(reducer),
});

export default store;
