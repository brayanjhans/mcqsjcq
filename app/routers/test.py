from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.seace import LicitacionesCabecera, LicitacionesAdjudicaciones

router = APIRouter()

@router.get("/api/test_search_exact")
def test_search_exact(search: str, db: Session = Depends(get_db)):
    query = db.query(LicitacionesCabecera)
    
    keywords = search.strip().split()
    for keyword in keywords:
        term = f"%{keyword}%"
        query = query.filter(
            or_(
                LicitacionesCabecera.nomenclatura.like(term),
                LicitacionesCabecera.descripcion.like(term),
                LicitacionesCabecera.adjudicaciones.any(
                    or_(
                        LicitacionesAdjudicaciones.ganador_nombre.like(term),
                    )
                )
            )
        )
    return {"results": len(query.limit(5).all())}

@router.get("/api/test_search_full")
def test_search_full(search: str, db: Session = Depends(get_db)):
    query = db.query(LicitacionesCabecera)
    query = query.outerjoin(LicitacionesCabecera.adjudicaciones)
    
    keywords = search.strip().split()
@router.get("/api/test_raw_sql")
def test_raw_sql(search: str, db: Session = Depends(get_db)):
    from sqlalchemy import text
    search_like = f"%{search}%"
    cab_sql = text("""
        SELECT id_convocatoria FROM licitaciones_cabecera 
        WHERE nomenclatura LIKE :search OR descripcion LIKE :search OR ocid LIKE :search
        LIMIT 10
    """)
    cab_ids = db.execute(cab_sql, {"search": search_like}).scalars().all()
    
    where_sql = "WHERE licitaciones_cabecera.id_convocatoria IN (:id0)"
    count_sql = text(f"""
        SELECT COUNT(DISTINCT id_convocatoria)
        FROM licitaciones_cabecera
        {where_sql}
    """)
    total = db.execute(count_sql, {"id0": cab_ids[0]}).scalar() or 0
    
    return {"results": cab_ids, "total": total}
