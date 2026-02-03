import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, ProgressBar } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { importacionesAPI } from '../services/api';

const Importaciones = () => {
  const [catalogoFile, setCatalogoFile] = useState(null);
  const [fichasFile, setFichasFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  

  const handleUpload = async (tipo) => {
    try {
      const file = tipo === 'catalogo' ? catalogoFile : fichasFile;
      if (!file) {
        toast.error('Selecciona un archivo antes de continuar');
        return;
      }

      setSubmitting(true);
      setProgress(10);
      
      const config = {
        onUploadProgress: (event) => {
          if (event.total) {
            
            const percent = Math.round((event.loaded * 100) / event.total);
            setProgress(percent);
          }
        }
      };

      const response =
        tipo === 'catalogo'
          ? await importacionesAPI.cargarCatalogo(file, config)
          : await importacionesAPI.cargarFichas(file, config);

      toast.success(response.data.message || 'Importación completada');
      setProgress(100);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al importar el archivo');
    } finally {
      setSubmitting(false);
      setTimeout(() => setProgress(0), 1500);
    }
  };

  const renderUploader = (title, description, file, setFile, action) => (
    <Card className="mb-4 shadow-sm">
      <Card.Body>
        <Card.Title>{title}</Card.Title>
        <Card.Text className="text-muted">{description}</Card.Text>
        <Form.Group controlId={`${title}-file`} className="mb-3">
          <Form.Control
            type="file"
            
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={submitting}
          />
          <Form.Text className="text-muted">
            Formato soportado: Excel (.xlsx). Usa la plantilla oficial del sistema.
          </Form.Text>
        </Form.Group>
        {progress > 0 && submitting && (
          <ProgressBar animated now={progress} label={`${progress}%`} className="mb-3" />
        )}
        <Button variant="primary" onClick={action} disabled={submitting}>
          {submitting ? 'Importando...' : 'Importar'}
        </Button>
     
      </Card.Body>
    </Card>
  );

  return (
    <Container fluid>
      <h2 className="mb-4">Importaciones desde Excel</h2>
      <Row>
        <Col md={6}>
          {renderUploader(
            'Importar Catálogo',
            'Crea o actualiza productos, tipos, materias primas y unidades desde la hoja "Todos los productos y tipos y m".',
            catalogoFile,
            setCatalogoFile,
            () => handleUpload('catalogo')
          )}
        </Col>
        <Col md={6}>
          {renderUploader(
            'Importar Fichas Técnicas',
            'Actualiza las fichas técnicas usando la hoja "fichas tecnicas". Se reemplazarán las asociaciones existentes.',
            fichasFile,
            setFichasFile,
            () => handleUpload('fichas')
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Importaciones;


