import { Filter, PackageSearch, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePantry } from '../context/PantryContext.jsx';
import { apiRequest } from '../utils/api.js';

const productArt = {
  'Sunflower Oil': ['🌻', '#f5b94c', '#fff3c4'], 'Groundnut Oil': ['🥜', '#b87935', '#f4dfbd'],
  'Mustard Oil': ['🌼', '#e0a629', '#fff0a8'], 'Coconut Oil': ['🥥', '#6d9b71', '#e8f0dc'],
  'Olive Oil': ['🫒', '#738b3b', '#dce8b5'], 'Cooking Oil': ['🛢️', '#dca93e', '#f7ecc8'],
  Pasta: ['🍝', '#d9a25f', '#fff0cf'],
  'Ragi Flour': ['🌾', '#9a6a43', '#ead4bd'], 'Millet Flour': ['🌾', '#d1ad63', '#f3e8bd'],
  'Toor Dal': ['🫘', '#d8a11f', '#fff1c2'], 'Moong Dal': ['🫘', '#9bbf50', '#edf4cf'],
  'Chana Dal': ['🫘', '#e0b44a', '#fff0c9'],
  'Masoor Dal': ['🫘', '#d97857', '#f6d5c7'], 'Urad Dal': ['🫘', '#59606a', '#dddde0'],
  'Basmati Rice': ['🌾', '#d8c58d', '#f7f1d7'], Milk: ['🥛', '#8fc9df', '#edf7fb'],
  Eggs: ['🥚', '#d8a35d', '#f7eed7'], Tomatoes: ['🍅', '#dc6a5e', '#f8ddd7'],
  'Turmeric Powder': ['🟡', '#dfad33', '#f7e8ad'], 'Instant Noodles': ['🍜', '#e8ae58', '#f9e6c8'],
  'Fresh Bread': ['🍞', '#bc8150', '#f1d9bc'], 'Red Apples': ['🍎', '#c95050', '#f4c8c4'],
  'Coffee Powder': ['☕', '#795442', '#dfcbc0'], 'Black Tea': ['🍵', '#7d9b63', '#dae5cd'],
  Potatoes: ['🥔', '#b98a55', '#ead9c2'], Onions: ['🧅', '#ae749d', '#ebdbe6'],
  Curd: ['🥣', '#8fc4c7', '#e6f2f2'], Sugar: ['🧂', '#cbd1d2', '#f5f6f6'],
  Biscuits: ['🍪', '#bd8749', '#efd9b8'], 'Wheat Flour': ['🌾', '#c7a36b', '#f1e5c7'],
  'Idli Rice': ['🍚', '#d6d1bc', '#f7f5e9'], 'Brown Rice': ['🌾', '#9b7650', '#e8d7c1'],
  Poha: ['🌾', '#d5cda8', '#f2efdc'], Ghee: ['🧈', '#dfa93c', '#fff0b9'],
  Salt: ['🧂', '#bfc9cb', '#f3f5f5'], 'Green Chillies': ['🌶️', '#5e9c54', '#dcecca'],
  Bananas: ['🍌', '#e5bd46', '#fbefbd'], Chickpeas: ['🫘', '#d29b50', '#f6e3c0']
};

function ProductArtwork({ item }) {
  const art = productArt[item.name] || ['📦', '#d6e4db', '#f4f7f5'];
  if (item.image) return <><img className="product-image" src={item.image} alt={item.name} loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; event.currentTarget.nextElementSibling?.removeAttribute('hidden'); }} /><div className="product-artwork product-artwork-fallback" hidden><span>{art[0]}</span><strong>{item.name}</strong></div></>;
  return <div className="product-artwork product-artwork-fallback"><span>{art[0]}</span><strong>{item.name}</strong></div>;
}

const formatUnit = (quantity, unit) => {
 if (unit === 'litres') return quantity === 1 ? 'litre' : 'litres';
 if (unit === 'pcs') return quantity === 1 ? 'piece' : 'pieces';
 return unit;
};
const formatQuantity = (quantity, unit) => {
 if (quantity == null || quantity === '') return 'Not available';
 const formattedUnit = unit ? formatUnit(quantity, unit) : '';
 return [quantity, formattedUnit].filter(Boolean).join(' ');
};
const formatExpiryDate = expiryDate => expiryDate ? String(expiryDate).slice(0, 10) : 'Not set';
const getCreatorName = createdBy => typeof createdBy === 'object' && createdBy !== null && typeof createdBy.name === 'string'
 ? createdBy.name.trim() || 'Not available'
 : 'Not available';
export default function BuyerShopping(){
 const { items, updateInventoryItem, replacePantryItems } = usePantry();
 const [searchParams,setSearchParams]=useSearchParams();
 const selectedPantryId=searchParams.get('pantryId')||'';
 const [pantries,setPantries]=useState([]);
 const [pantriesLoading,setPantriesLoading]=useState(true);
 const [inventoryLoading,setInventoryLoading]=useState(false);
 const [apiError,setApiError]=useState('');
 const [search, setSearch] = useState('');
 const [category, setCategory] = useState('All');
 const [stock, setStock] = useState('All');
 const [filtersOpen, setFiltersOpen] = useState(false);
 const [quantities, setQuantities] = useState({});
 const [updatingItemId, setUpdatingItemId] = useState('');
 const [successMessage, setSuccessMessage] = useState('');
 useEffect(()=>{
   let active=true;
   apiRequest('/api/pantries/member').then(payload=>{
     if(!active)return;
     setPantries(payload.pantries);
     setPantriesLoading(false);
     if(!selectedPantryId&&payload.pantries.length===1)setSearchParams({pantryId:payload.pantries[0].id},{replace:true});
   }).catch(error=>{
     if(!active)return;
     setApiError(error.message);
     setPantriesLoading(false);
   });
   return()=>{active=false;};
 },[]);
 useEffect(()=>{
   if(!selectedPantryId||pantriesLoading)return;
   if(!pantries.some(pantry=>pantry.id===selectedPantryId)){
     setApiError('Select a pantry shared with your account.');
     return;
   }
   let active=true;
   setInventoryLoading(true);
   apiRequest(`/api/pantries/${selectedPantryId}/items`).then(payload=>{
     if(active){
       replacePantryItems(selectedPantryId,payload.items);
       setApiError('');
     }
   }).catch(error=>{
     if(active)setApiError(error.message);
   }).finally(()=>{
     if(active)setInventoryLoading(false);
   });
   return()=>{active=false;};
 },[selectedPantryId,pantries,pantriesLoading]);
 const products=selectedPantryId?items.filter(item=>item.pantryId===selectedPantryId):[];
 const categories=['All', ...new Set(products.map(item=>item.category))];
 const filtered=useMemo(()=>products.filter(item=>{
   const matchesSearch=item.name.toLowerCase().includes(search.trim().toLowerCase());
   const matchesCategory=category==='All'||item.category===category;
   const matchesStock=stock==='All'||(stock==='In stock'&&item.quantity>0)||(stock==='Out of stock'&&item.quantity<=0)||(stock==='Low stock'&&item.quantity<=item.lowStockThreshold);
   return matchesSearch&&matchesCategory&&matchesStock;
 }),[products,search,category,stock]);
 const clearFilters=()=>{setSearch('');setCategory('All');setStock('All');};
 const adjustQuantity = async (item, direction) => {
   const quantity = Number(quantities[item.id] ?? 1);
   if (!Number.isFinite(quantity) || quantity <= 0) {
     setApiError('Enter a quantity greater than zero.');
     setSuccessMessage('');
     return;
   }
   const changeAmount = direction === 'use' ? -quantity : quantity;
   setUpdatingItemId(item.id);
   setApiError('');
   setSuccessMessage('');
   try {
     const payload = await apiRequest(`/api/items/${item.id}`, {
       method: 'PATCH',
       body: JSON.stringify({ changeAmount })
     });
     updateInventoryItem(payload.item.id, payload.item);
     setSuccessMessage(direction === 'use'
       ? `Used ${formatQuantity(quantity, item.unit)} of ${item.name}.`
       : `Added ${formatQuantity(quantity, item.unit)} to ${item.name}.`);
   } catch (error) {
     setApiError(error.message);
   } finally {
     setUpdatingItemId('');
   }
 };
 return <div className="page"> <div className="page-heading"><div><p className="eyebrow">Member portal</p><h1>Inventory Items</h1><p>Add stock when items arrive or record usage to reduce the available quantity.</p></div></div>{pantries.length>0&&<label>Pantry<select aria-label="Select pantry" value={selectedPantryId} onChange={event=>{setApiError('');setSuccessMessage('');setSearchParams(event.target.value?{pantryId:event.target.value}:{});setCategory('All');}}><option value="">Select a pantry</option>{pantries.map(pantry=><option key={pantry.id} value={pantry.id}>{pantry.name}</option>)}</select></label>}
 {apiError&&<div className="form-error" role="alert">{apiError}</div>}
 {successMessage&&<div className="form-success" role="status">{successMessage}</div>}
 {pantriesLoading||inventoryLoading?<p className="empty-state" aria-busy="true">Loading pantry inventory…</p>:!selectedPantryId?<div className="empty-state"><PackageSearch size={28}/><h3>{pantries.length?'Select a pantry':'No shared pantries yet'}</h3><p>{pantries.length?'Choose a shared pantry to view its inventory.':'Ask an owner to add your account as a member.'}</p></div>:null}
 <div className="shop-toolbar"><label className="search-field"><Search size={18}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search pantry items..."/></label><button className={`btn secondary filter-toggle ${filtersOpen?'active':''}`} type="button" onClick={()=>setFiltersOpen(open=>!open)}><Filter size={17}/> Filter{(category!== 'All'||stock!=='All')&&<span className="filter-count">{[category!=='All',stock!=='All'].filter(Boolean).length}</span>}</button></div>
 {filtersOpen&&<div className="shop-filter-panel"><label>Category<select value={category} onChange={event=>setCategory(event.target.value)}>{categories.map(value=><option key={value}>{value}</option>)}</select></label><label>Availability<select value={stock} onChange={event=>setStock(event.target.value)}><option>All</option><option>In stock</option><option>Low stock</option><option>Out of stock</option></select></label><button className="icon-button filter-close" type="button" aria-label="Clear filters" onClick={clearFilters}><X size={18}/></button></div>}
 <div className="shop-results-count">Showing {filtered.length} of {products.length} items{(search||category!== 'All'||stock!== 'All')&&<button type="button" onClick={clearFilters}>Clear filters</button>}</div>
 {!pantriesLoading&&!inventoryLoading&&selectedPantryId&&<div className="product-grid">{filtered.map(item=><article className="product-card" key={item.id}><div className="product-image-wrap"><ProductArtwork item={item} /></div><span className="product-category">{item.category}</span><h2>{item.name}</h2><p>{formatQuantity(item.quantity, item.unit)} available · <strong className={item.quantity<=0?'negative':'in-stock'}>{item.quantity<=0?'Out of stock':'In stock'}</strong></p><div className="product-details"><p><strong>Expiry date:</strong> {formatExpiryDate(item.expiryDate)}</p><p><strong>Low stock threshold:</strong> {formatQuantity(item.lowStockThreshold, item.unit)}</p><p><strong>Created by:</strong> {getCreatorName(item.createdBy)}</p></div><div className="product-bottom"><div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}><label style={{ alignItems: 'center', display: 'flex', gap: 8 }}>Quantity<input aria-label={`Quantity to adjust for ${item.name}`} className="member-quantity-input" type="number" min="0.01" step="any" value={quantities[item.id] ?? 1} onChange={event=>setQuantities(previous=>({...previous,[item.id]:event.target.value}))}/></label><button className="btn secondary" style={{ alignItems: 'center', display: 'inline-flex', gap: 6, whiteSpace: 'nowrap' }} type="button" disabled={updatingItemId===item.id} onClick={()=>adjustQuantity(item, 'add')}><Plus size={17}/>{updatingItemId===item.id?'Updating...':'Add quantity'}</button><button className="btn secondary" style={{ alignItems: 'center', display: 'inline-flex', gap: 6, whiteSpace: 'nowrap' }} type="button" disabled={updatingItemId===item.id||item.quantity<=0} onClick={()=>adjustQuantity(item, 'use')}>Use quantity</button></div></div></article>)}</div>}
 {!pantriesLoading&&!inventoryLoading&&selectedPantryId&&!filtered.length&&<div className="empty-state"><PackageSearch size={28}/><h3>{products.length?'No items match these filters':'No items in this pantry yet'}</h3><p>{products.length?'Change the category, availability, or search text.':'The pantry owner has not added any inventory yet.'}</p>{products.length>0&&<button className="btn secondary" onClick={clearFilters}>Clear filters</button>}</div>}
 </div>;
}
